'use server'

import { Prisma } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { AuthorizationContext, requireBranchScope, requireCirculationAccess, requireLibraryScope, requireTenantScope } from '@/lib/authorization'

const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000)
const admin = (context: AuthorizationContext) => context.platformRole === 'PLATFORM_ADMIN' || context.platformRole === 'TENANT_ADMIN'

export interface CheckoutParams { context: AuthorizationContext; memberId: string; itemId: string; branchId: string; daysToLoan?: number; idempotencyKey: string }
export interface ReturnParams { context: AuthorizationContext; loanId: string; branchId: string; itemId: string; condition?: string; idempotencyKey: string }
export interface RenewParams { context: AuthorizationContext; loanId: string; memberId: string; idempotencyKey: string }

async function audit(tx: Prisma.TransactionClient, context: AuthorizationContext, action: string, entity: string, entityId: string | undefined, result: 'SUCCESS' | 'FAILURE', after?: unknown) {
  return tx.auditLog.create({ data: { tenantId: context.tenantId, userId: context.userId, action, entity, entityId, result, after: after === undefined ? undefined : (after as Prisma.InputJsonValue) } })
}

export async function checkout(params: CheckoutParams) {
  const { context, memberId, itemId, branchId, daysToLoan = 21, idempotencyKey } = params
  requireCirculationAccess(context); requireBranchScope(context, branchId)
  if (!idempotencyKey) throw new Error('Idempotency key required')
  return prisma.$transaction(async (tx) => {
    const key = await tx.idempotencyKey.findUnique({ where: { tenantId_key: { tenantId: context.tenantId, key: idempotencyKey } } })
    if (key?.responseJson) return JSON.parse(String(key.responseJson))
    const member = await tx.member.findFirst({ where: { id: memberId, branch: { id: { in: Array.from(context.branchIds) } } }, include: { category: true } })
    if (!member) throw new Error('Member not found in authorized scope')
    const policy = await tx.circulationPolicy.findFirst({ where: { libraryId: member.libraryId, status: 'ACTIVE' }, orderBy: { name: 'asc' } })
    if (!policy) throw new Error('No active circulation policy configured')
    const loanDays = daysToLoan ?? member.category?.loanDays ?? policy.loanDays
    requireLibraryScope(context, member.libraryId)
    const outstandingFines = await tx.fine.findMany({ where: { memberId, paidAt: null }, select: { amount: true } })
    const item = await tx.item.findFirst({ where: { id: itemId, branchId, branch: { library: { tenantId: context.tenantId } }, holding: { record: { library: { tenantId: context.tenantId } } } }, include: { loans: { where: { status: 'ACTIVE' } } } })
    if (!item) throw new Error('Item not found in authorized scope')
    if (member.status !== 'ACTIVE') throw new Error(`Member is ${member.status}`)
    if (outstandingFines.some((fine) => fine.amount.gt(0))) throw new Error('Member has outstanding fines')
    if (item.status !== 'AVAILABLE' || item.loans.length) throw new Error('Item is not available')
    const loan = await tx.loan.create({ data: { memberId, itemId, branchId, dueDate: addDays(new Date(), loanDays) }, include: { member: true, item: true } })
    await tx.item.update({ where: { id: itemId }, data: { status: 'ON_LOAN' } })
    await tx.itemStatusHistory.create({ data: { itemId, fromStatus: 'AVAILABLE', toStatus: 'ON_LOAN', reason: 'CHECKOUT', loanId: loan.id, actorId: context.userId } })
    const response = { success: true, loan: { id: loan.id, memberId, itemId, dueDate: loan.dueDate.toISOString(), memberName: loan.member.name, barcode: loan.item.barcode } }
    await audit(tx, context, 'checkout', 'Loan', loan.id, 'SUCCESS', response)
    await tx.idempotencyKey.create({ data: { tenantId: context.tenantId, key: idempotencyKey, operation: 'checkout', requestHash: `${memberId}:${itemId}:${branchId}`, responseJson: JSON.stringify(response), expiresAt: addDays(new Date(), 30) } })
    return response
  })
}

export async function returnItem(params: ReturnParams) {
  const { context, loanId, branchId, itemId, condition } = params
  requireCirculationAccess(context); requireBranchScope(context, branchId)
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findFirst({ where: { id: loanId, branchId, itemId, branch: { library: { tenantId: context.tenantId } } }, include: { member: true, item: true } })
    if (!loan) throw new Error('Loan not found in authorized scope')
    if (loan.status !== 'ACTIVE' && loan.status !== 'OVERDUE') throw new Error(`Loan is already ${loan.status}`)
    const now = new Date(); const policy = await tx.circulationPolicy.findFirst({ where: { libraryId: loan.member.libraryId, status: 'ACTIVE' }, orderBy: { name: 'asc' } }); if (!policy) throw new Error('No active circulation policy configured'); const overdueDays = Math.max(0, Math.floor((now.getTime() - loan.dueDate.getTime()) / 86_400_000) - policy.graceDays); const fineAmount = policy.dailyFine.mul(overdueDays)
    const fine = overdueDays ? await tx.fine.create({ data: { memberId: loan.memberId, amount: fineAmount, reason: `Overdue ${overdueDays} days` } }) : null
    const status = condition === 'DAMAGED' ? 'DAMAGED' : 'AVAILABLE'
    const updated = await tx.loan.update({ where: { id: loan.id }, data: { status: 'RETURNED', returnedAt: now } })
    await tx.item.update({ where: { id: itemId }, data: { status, condition: condition || 'GOOD' } })
    await tx.itemStatusHistory.create({ data: { itemId, fromStatus: 'ON_LOAN', toStatus: status, reason: status === 'DAMAGED' ? 'DAMAGE' : 'RETURN', loanId, actorId: context.userId } })
    await audit(tx, context, 'return', 'Loan', loan.id, 'SUCCESS', { loanId, fineId: fine?.id, status: updated.status })
    return { success: true, loanId, memberName: loan.member.name, itemBarcode: loan.item.barcode, fine: fine ? { id: fine.id, amount: fine.amount.toString() } : null }
  })
}

export async function renewLoan(params: RenewParams) {
  const { context, loanId, memberId } = params
  requireCirculationAccess(context)
  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findFirst({ where: { id: loanId, memberId, member: { library: { tenantId: context.tenantId } }, ...(admin(context) ? {} : { branchId: { in: Array.from(context.branchIds) } }) }, include: { member: true, item: true } })
    if (!loan) throw new Error('Loan not found in authorized scope')
    if (loan.status !== 'ACTIVE') throw new Error('Loan not active')
    const policy = await tx.circulationPolicy.findFirst({ where: { libraryId: loan.member.libraryId, status: 'ACTIVE' }, orderBy: { name: 'asc' } }); if (!policy) throw new Error('No active circulation policy configured'); if (loan.renewals >= policy.maxRenewals) throw new Error('Maximum renewals reached')
    const holds = await tx.hold.count({ where: { itemId: loan.itemId, status: { in: ['QUEUED', 'READY'] }, member: { library: { tenantId: context.tenantId } } } })
    if (holds) throw new Error('Cannot renew: item is on hold')
    const newDueDate = addDays(loan.dueDate, policy.loanDays)
    const updated = await tx.loan.update({ where: { id: loan.id }, data: { renewals: { increment: 1 }, dueDate: newDueDate } })
    await tx.loanRenewal.create({ data: { loanId, previousDue: loan.dueDate, newDue: newDueDate, result: 'APPROVED', actorId: context.userId } })
    await audit(tx, context, 'renew', 'Loan', loan.id, 'SUCCESS', { renewals: updated.renewals, newDueDate })
    return { success: true, loanId, newDueDate: newDueDate.toISOString(), renewalsRemaining: policy.maxRenewals - updated.renewals }
  })
}
