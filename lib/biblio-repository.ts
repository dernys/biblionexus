import { prisma } from '@/lib/prisma'

export async function searchCatalog(libraryId: string, query = '') {
  return prisma.bibliographicRecord.findMany({
    where: {
      libraryId,
      status: 'PUBLISHED',
      ...(query ? { title: { contains: query, mode: 'insensitive' } } : {}),
    },
    include: {
      authors: { include: { author: true } },
      publisher: true,
      holdings: { include: { items: true } },
    },
    orderBy: { title: 'asc' },
    take: 50,
  })
}

export async function getCirculationSummary(libraryId: string) {
  const [activeLoans, overdueLoans, activeMembers, availableItems] = await Promise.all([
    prisma.loan.count({ where: { branch: { libraryId }, status: 'ACTIVE' } }),
    prisma.loan.count({ where: { branch: { libraryId }, status: 'OVERDUE' } }),
    prisma.member.count({ where: { libraryId, status: 'ACTIVE' } }),
    prisma.item.count({ where: { branch: { libraryId }, status: 'AVAILABLE' } }),
  ])
  return { activeLoans, overdueLoans, activeMembers, availableItems }
}
