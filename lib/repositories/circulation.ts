import type { PrismaClient, Prisma } from '@/lib/generated/prisma/client'

export type DbClient = PrismaClient | Prisma.TransactionClient

export function memberInTenant(db: DbClient, tenantId: string, memberId: string) {
  return db.member.findFirst({ where: { id: memberId, library: { tenantId } }, include: { category: true, branch: true } })
}

export function availableItemInBranch(db: DbClient, tenantId: string, itemId: string, branchId: string) {
  return db.item.findFirst({
    where: { id: itemId, branchId, holding: { branchId, record: { library: { tenantId } } } },
    include: { loans: { where: { status: 'ACTIVE' } } },
  })
}

export function loanInTenant(db: DbClient, tenantId: string, loanId: string, branchId: string, itemId?: string) {
  return db.loan.findFirst({
    where: { id: loanId, branchId, itemId, branch: { library: { tenantId } } },
    include: { member: true, item: true },
  })
}

export function activeHoldsForItem(db: DbClient, tenantId: string, itemId: string) {
  return db.hold.count({ where: { itemId, status: { in: ['QUEUED', 'READY'] }, member: { library: { tenantId } } } })
}
