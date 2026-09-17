import { prisma } from '@/lib/prisma'
import { requirePermission, requireSession, type AuthorizationContext } from '@/lib/authorization'

function branchScope(context: AuthorizationContext) {
  if (context.platformRole === 'PLATFORM_ADMIN' || context.platformRole === 'TENANT_ADMIN') return {}
  return { branchId: { in: [...context.branchIds] } }
}

export async function getDashboardData() {
  const context = requirePermission(await requireSession(), 'reports:read')
  const tenant = { library: { tenantId: context.tenantId } }
  const branches = branchScope(context)
  const [activeLoans, overdueLoans, members, records, items, holds, recentActivity] = await Promise.all([
    prisma.loan.count({ where: { status: 'ACTIVE', branch: tenant, ...branches } }),
    prisma.loan.count({ where: { status: 'OVERDUE', branch: tenant, ...branches } }),
    prisma.member.count({ where: { status: 'ACTIVE', library: { tenantId: context.tenantId }, ...(context.platformRole || context.libraryIds.length === 0 ? {} : { branchId: { in: [...context.branchIds] } }) } }),
    prisma.bibliographicRecord.count({ where: { library: { tenantId: context.tenantId }, ...(context.platformRole || context.libraryIds.length === 0 ? {} : { libraryId: { in: [...context.libraryIds] } }) } }),
    prisma.item.count({ where: { branch: tenant, ...branches } }),
    prisma.hold.count({ where: { status: { in: ['QUEUED', 'READY'] }, member: { library: { tenantId: context.tenantId } } } }),
    prisma.auditLog.findMany({ where: { tenantId: context.tenantId }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, action: true, entity: true, createdAt: true, result: true } }),
  ])

  return {
    metrics: { activeLoans, overdueLoans, members, records, items, holds },
    recentActivity: recentActivity.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
  }
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>
