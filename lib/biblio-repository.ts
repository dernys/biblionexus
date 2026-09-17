import { Prisma } from '@/lib/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { AuthorizationContext, requireLibraryScope, requireTenantScope } from '@/lib/authorization'

export async function searchCatalog(context: AuthorizationContext, libraryId: string, query = '') {
  requireLibraryScope(context, libraryId)
  return prisma.bibliographicRecord.findMany({
    where: { libraryId, status: 'PUBLISHED', ...(query ? { title: { contains: query, mode: 'insensitive' } } : {}) } as Prisma.BibliographicRecordWhereInput,
    include: { authors: { include: { author: true } }, publisher: true, holdings: { include: { items: true } } },
    orderBy: { title: 'asc' }, take: 50,
  })
}

export async function getCirculationSummary(context: AuthorizationContext, libraryId: string) {
  requireLibraryScope(context, libraryId)
  const branchScope = context.platformRole === 'PLATFORM_ADMIN' || context.platformRole === 'TENANT_ADMIN' ? { libraryId } : { id: { in: Array.from(context.branchIds) }, libraryId }
  const [activeLoans, overdueLoans, activeMembers, availableItems] = await Promise.all([
    prisma.loan.count({ where: { branch: { ...branchScope, library: { tenantId: context.tenantId } }, status: 'ACTIVE' } }),
    prisma.loan.count({ where: { branch: { ...branchScope, library: { tenantId: context.tenantId } }, status: 'OVERDUE' } }),
    prisma.member.count({ where: { libraryId, library: { tenantId: context.tenantId }, status: 'ACTIVE' } }),
    prisma.item.count({ where: { branch: { ...branchScope, library: { tenantId: context.tenantId } }, status: 'AVAILABLE' } }),
  ])
  requireTenantScope(context, context.tenantId)
  return { activeLoans, overdueLoans, activeMembers, availableItems }
}
