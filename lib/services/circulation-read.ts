import { prisma } from '@/lib/prisma'
import type { AuthorizationContext } from '@/lib/authorization'
import { requireCirculationAccess } from '@/lib/authorization'

export async function getCirculationOverview(context: AuthorizationContext) {
  requireCirculationAccess(context)
  const loans = await prisma.loan.findMany({
    where: { member: { library: { tenantId: context.tenantId, id: { in: Array.from(context.libraryIds) } } }, ...(context.branchIds.length ? { branchId: { in: Array.from(context.branchIds) } } : {}) },
    orderBy: { dueDate: 'asc' },
    take: 100,
    include: { member: { select: { name: true } }, item: { select: { barcode: true, holding: { select: { record: { select: { title: true } } } } } } },
  })
  const active = loans.filter((loan) => loan.status === 'ACTIVE' || loan.status === 'OVERDUE')
  return { records: active.map((loan) => [loan.item.holding.record.title, loan.member.name, loan.item.barcode, loan.status === 'OVERDUE' ? 'Overdue' : 'Active', loan.dueDate.toISOString().slice(0, 10)] as string[]), metrics: [{ label: 'Active loans', value: String(active.length), note: 'Live PostgreSQL count' }, { label: 'Overdue', value: String(active.filter((loan) => loan.status === 'OVERDUE').length), note: 'Requires attention' }, { label: 'Visible queue', value: String(loans.length), note: 'Authorized scope' }] }
}
