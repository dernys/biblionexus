import { prisma } from '@/lib/prisma'
import { requirePermission, requireSession } from '@/lib/authorization'

export async function getCatalogRecords(query = '') {
  const context = requirePermission(await requireSession(), 'catalog:read')
  const normalizedQuery = query.trim()
  const libraryScope = context.platformRole ? {} : { libraryId: { in: [...context.libraryIds] } }
  const records = await prisma.bibliographicRecord.findMany({
    where: {
      ...libraryScope,
      ...(normalizedQuery ? { OR: [{ title: { contains: normalizedQuery, mode: 'insensitive' } }, { authors: { some: { author: { name: { contains: normalizedQuery, mode: 'insensitive' } } } } }, { identifiers: { some: { value: { contains: normalizedQuery, mode: 'insensitive' } } } }] } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { id: true, title: true, language: true, year: true, status: true, authors: { select: { author: { select: { name: true } } } }, editions: { select: { isbn: true }, take: 1 }, holdings: { select: { items: { select: { id: true } } } } },
  })
  return records.map((record) => ({ id: record.id, title: record.title, language: record.language, year: record.year, status: record.status, authors: record.authors.map(({ author }) => author.name), isbn: record.editions[0]?.isbn ?? null, holdings: record.holdings.length, items: record.holdings.reduce((total, holding) => total + holding.items.length, 0) }))
}

export type CatalogRecords = Awaited<ReturnType<typeof getCatalogRecords>>
