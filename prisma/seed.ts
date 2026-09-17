import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL ?? 'postgresql://localhost:5432/biblionexus'
const pool = new Pool({ connectionString })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-network' },
    update: {},
    create: { name: 'BiblioNexus Demo Network', slug: 'demo-network' },
  })

  const library = await prisma.library.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'central-library' } },
    update: {},
    create: { tenantId: tenant.id, name: 'Central Library', slug: 'central-library' },
  })

  const [central, riverside] = await Promise.all([
    prisma.branch.upsert({
      where: { libraryId_code: { libraryId: library.id, code: 'CEN' } },
      update: {},
      create: { libraryId: library.id, name: 'Central Library', code: 'CEN', address: '100 Civic Plaza' },
    }),
    prisma.branch.upsert({
      where: { libraryId_code: { libraryId: library.id, code: 'RIV' } },
      update: {},
      create: { libraryId: library.id, name: 'Riverside Branch', code: 'RIV', address: '22 River Street' },
    }),
  ])

  const collection = await prisma.collection.upsert({
    where: { id: `${library.id}-fiction` },
    update: {},
    create: { id: `${library.id}-fiction`, libraryId: library.id, name: 'General Fiction', description: 'Core circulating fiction collection' },
  })

  const [garcia, morrison] = await Promise.all([
    prisma.author.upsert({ where: { id: `${library.id}-garcia` }, update: {}, create: { id: `${library.id}-garcia`, name: 'Gabriel García Márquez' } }),
    prisma.author.upsert({ where: { id: `${library.id}-morrison` }, update: {}, create: { id: `${library.id}-morrison`, name: 'Toni Morrison' } }),
  ])
  const publisher = await prisma.publisher.upsert({ where: { name: 'BiblioNexus Press' }, update: {}, create: { name: 'BiblioNexus Press' } })

  const records = [
    { id: `${library.id}-one-hundred-years`, title: 'One Hundred Years of Solitude', author: garcia, isbn: '9780060883287', year: 1967 },
    { id: `${library.id}-beloved`, title: 'Beloved', author: morrison, isbn: '9781400033416', year: 1987 },
  ]

  for (const entry of records) {
    const record = await prisma.bibliographicRecord.upsert({
      where: { id: entry.id },
      update: {},
      create: {
        id: entry.id,
        libraryId: library.id,
        collectionId: collection.id,
        publisherId: publisher.id,
        title: entry.title,
        year: entry.year,
        language: 'en',
        classification: 'FIC',
        subjects: ['Literature', 'Fiction'],
        authors: { create: { authorId: entry.author.id } },
        editions: { create: { isbn: entry.isbn, year: entry.year, label: 'Library edition' } },
      },
      include: { editions: true },
    })

    for (const branch of [central, riverside]) {
      const holding = await prisma.holding.upsert({
        where: { recordId_branchId: { recordId: record.id, branchId: branch.id } },
        update: {},
        create: { recordId: record.id, branchId: branch.id, shelfmark: `FIC ${entry.title.slice(0, 3).toUpperCase()}` },
      })
      const barcode = `${branch.code}-${entry.isbn.slice(-6)}`
      await prisma.item.upsert({ where: { barcode }, update: {}, create: { holdingId: holding.id, editionId: record.editions[0]?.id, branchId: branch.id, collectionId: collection.id, barcode, materialType: 'BOOK', condition: 'GOOD' } })
    }
  }

  await prisma.member.upsert({
    where: { libraryId_memberNumber: { libraryId: library.id, memberNumber: 'M-10001' } },
    update: {},
    create: { libraryId: library.id, branchId: central.id, memberNumber: 'M-10001', barcode: 'BNX-M-10001', name: 'Avery Morgan', email: 'avery.morgan@example.com', category: 'Adult' },
  })

  console.log(`Seeded ${tenant.name} with ${library.name}, two branches, catalog records, items, and a demo member.`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect(); await pool.end() })
