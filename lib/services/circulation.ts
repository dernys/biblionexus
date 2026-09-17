'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

function addDays(date: Date, days: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export interface CheckoutParams {
  memberId: string
  itemId: string
  branchId: string
  daysToLoan?: number
  idempotencyKey?: string
  actorId?: string
}

export interface ReturnParams {
  loanId: string
  branchId: string
  itemId: string
  condition?: string
  idempotencyKey?: string
  actorId?: string
}

export interface RenewParams {
  loanId: string
  memberId: string
  idempotencyKey?: string
  actorId?: string
}

/**
 * Transactional checkout: validates member, item, policy, and creates loan atomically.
 * Prevents double-loan and enforces business rules.
 */
export async function checkout(params: CheckoutParams) {
  const {
    memberId,
    itemId,
    branchId,
    daysToLoan = 21,
    idempotencyKey,
    actorId,
  } = params

  // Idempotency check
  if (idempotencyKey) {
    const existing = await prisma.idempotencyKey.findUnique({
      where: { tenantId_key: { tenantId: 'demo-tenant', key: idempotencyKey } },
    })
    if (existing?.responseJson) {
      return JSON.parse(existing.responseJson as string)
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Validate member
      const member = await tx.member.findUnique({
        where: { id: memberId },
        include: { loans: { where: { status: 'ACTIVE' } }, fines: { where: { paidAt: null } } },
      })

      if (!member) throw new Error('Member not found')
      if (member.status !== 'ACTIVE') throw new Error(`Member is ${member.status}`)
      if (member.fines && member.fines.length > 0) {
        const totalFines = member.fines.reduce((sum, f) => sum.add(f.amount), new Prisma.Decimal(0))
        if (totalFines.gt(0)) throw new Error('Member has outstanding fines')
      }

      // 2. Validate item
      const item = await tx.item.findUnique({
        where: { id: itemId },
        include: { loans: { where: { status: 'ACTIVE' } }, branch: true },
      })

      if (!item) throw new Error('Item not found')
      if (item.status !== 'AVAILABLE') throw new Error(`Item is ${item.status}`)
      if (item.loans && item.loans.length > 0) throw new Error('Item already on loan')

      // 3. Calculate due date
      const dueDate = addDays(new Date(), daysToLoan)

      // 4. Create loan
      const loan = await tx.loan.create({
        data: {
          memberId,
          itemId,
          branchId,
          dueDate,
          status: 'ACTIVE',
        },
        include: { member: true, item: true },
      })

      // 5. Update item status
      await tx.item.update({
        where: { id: itemId },
        data: { status: 'ON_LOAN' },
      })

      // 6. Record status change
      await tx.itemStatusHistory.create({
        data: {
          itemId,
          fromStatus: 'AVAILABLE',
          toStatus: 'ON_LOAN',
          reason: 'CHECKOUT',
          loanId: loan.id,
          actorId,
        },
      })

      // 7. Record audit
      await tx.auditLog.create({
        data: {
          tenantId: 'demo-tenant',
          userId: actorId,
          action: 'checkout',
          entity: 'Loan',
          entityId: loan.id,
          after: JSON.stringify(loan),
          result: 'SUCCESS',
        },
      })

      const response = {
        success: true,
        loan: {
          id: loan.id,
          memberId: loan.memberId,
          itemId: loan.itemId,
          loanDate: loan.loanDate.toISOString(),
          dueDate: loan.dueDate.toISOString(),
          memberName: loan.member.name,
          barcode: loan.item.barcode,
        },
      }

      // Store for idempotency
      if (idempotencyKey) {
        await tx.idempotencyKey.upsert({
          where: { tenantId_key: { tenantId: 'demo-tenant', key: idempotencyKey } },
          update: { responseJson: JSON.stringify(response), expiresAt: addDays(new Date(), 30) },
          create: {
            tenantId: 'demo-tenant',
            key: idempotencyKey,
            operation: 'checkout',
            requestHash: memberId + itemId,
            responseJson: JSON.stringify(response),
            expiresAt: addDays(new Date(), 30),
          },
        })
      }

      return response
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Checkout failed'
    const response = { success: false, error: message }

    // Log failure
    if (idempotencyKey) {
      await prisma.idempotencyKey.upsert({
        where: { tenantId_key: { tenantId: 'demo-tenant', key: idempotencyKey } },
        update: { responseJson: JSON.stringify(response), expiresAt: addDays(new Date(), 30) },
        create: {
          tenantId: 'demo-tenant',
          key: idempotencyKey,
          operation: 'checkout',
          requestHash: memberId + itemId,
          responseJson: JSON.stringify(response),
          expiresAt: addDays(new Date(), 30),
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        tenantId: 'demo-tenant',
        userId: actorId,
        action: 'checkout',
        entity: 'Loan',
        after: JSON.stringify(params),
        result: 'FAILURE',
      },
    })

    return response
  }
}

/**
 * Transactional return: closes loan, updates item status, calculates fines.
 */
export async function returnItem(params: ReturnParams) {
  const { loanId, branchId, itemId, condition, idempotencyKey, actorId } = params

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Find active loan
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: { member: true, item: true },
      })

      if (!loan) throw new Error('Loan not found')
      if (loan.status !== 'ACTIVE') throw new Error(`Loan is already ${loan.status}`)

      // 2. Calculate fine if overdue
      const today = new Date()
      let fine: { id: string } | null = null

      if (today > loan.dueDate) {
        const daysOverdue = Math.floor((today.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24))
        const fineAmount = new Prisma.Decimal(daysOverdue * 0.5) // $0.50 per day

        fine = await tx.fine.create({
          data: {
            memberId: loan.memberId,
            amount: fineAmount,
            reason: `Overdue ${daysOverdue} days`,
          },
        })
      }

      // 3. Close loan
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: {
          status: 'RETURNED',
          returnedAt: today,
        },
      })

      // 4. Update item status
      const newStatus = condition === 'DAMAGED' ? 'DAMAGED' : 'AVAILABLE'
      await tx.item.update({
        where: { id: itemId },
        data: { status: newStatus, condition: condition || 'GOOD' },
      })

      // 5. Record status change
      await tx.itemStatusHistory.create({
        data: {
          itemId,
          fromStatus: 'ON_LOAN',
          toStatus: newStatus,
          reason: condition === 'DAMAGED' ? 'DAMAGE' : 'RETURN',
          note: condition ? `Returned in ${condition} condition` : undefined,
          loanId: loanId,
          actorId,
        },
      })

      // 6. Record audit
      await tx.auditLog.create({
        data: {
          tenantId: 'demo-tenant',
          userId: actorId,
          action: 'return',
          entity: 'Loan',
          entityId: loanId,
          after: JSON.stringify({ ...updatedLoan, fineId: fine?.id }),
          result: 'SUCCESS',
        },
      })

      return {
        success: true,
        loanId,
        memberName: loan.member.name,
        itemBarcode: loan.item.barcode,
        fine: fine ? { id: fine.id, amount: '0.50' } : null,
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Return failed'
    await prisma.auditLog.create({
      data: {
        tenantId: 'demo-tenant',
        userId: actorId,
        action: 'return',
        entity: 'Loan',
        entityId: loanId,
        after: JSON.stringify(params),
        result: 'FAILURE',
      },
    })
    return { success: false, error: message }
  }
}

/**
 * Transactional renewal: checks eligibility and extends due date.
 */
export async function renewLoan(params: RenewParams) {
  const { loanId, memberId, idempotencyKey, actorId } = params

  try {
    return await prisma.$transaction(async (tx) => {
      // Find active loan
      const loan = await tx.loan.findUnique({
        where: { id: loanId },
        include: { member: true, item: true },
      })

      if (!loan) throw new Error('Loan not found')
      if (loan.status !== 'ACTIVE') throw new Error('Loan not active')
      if (loan.memberId !== memberId) throw new Error('Member mismatch')
      if (loan.renewals >= 3) throw new Error('Maximum renewals reached')

      // Check for queued holds before extending the loan.
      const queuedHolds = await tx.hold.count({
        where: { itemId: loan.itemId, status: { in: ['QUEUED', 'READY'] } },
      })
      if (queuedHolds > 0) throw new Error('Cannot renew: item is on hold')

      // Extend due date
      const newDueDate = addDays(loan.dueDate, 21)

      const updated = await tx.loan.update({
        where: { id: loanId },
        data: {
          renewals: loan.renewals + 1,
          dueDate: newDueDate,
        },
      })

      // Record renewal
      await tx.loanRenewal.create({
        data: {
          loanId,
          previousDue: loan.dueDate,
          newDue: newDueDate,
          result: 'APPROVED',
          actorId,
        },
      })

      return {
        success: true,
        loanId,
        newDueDate: newDueDate.toISOString(),
        renewalsRemaining: 3 - (loan.renewals + 1),
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Renewal failed'
    await prisma.auditLog.create({
      data: {
        tenantId: 'demo-tenant',
        userId: actorId,
        action: 'renew',
        entity: 'Loan',
        entityId: loanId,
        result: 'FAILURE',
      },
    })
    return { success: false, error: message }
  }
}
