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

  const network = await prisma.libraryNetwork.upsert({
    where: { id: `${tenant.id}-network` },
    update: {},
    create: { id: `${tenant.id}-network`, tenantId: tenant.id, name: 'BiblioNexus Development Network' },
  })

  const library = await prisma.library.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'central-library' } },
    update: { networkId: network.id },
    create: { tenantId: tenant.id, networkId: network.id, name: 'Central Library', slug: 'central-library' },
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

  const [adultCategory, bookMaterial] = await Promise.all([
    prisma.memberCategory.upsert({
      where: { libraryId_name: { libraryId: library.id, name: 'Adult' } },
      update: { loanDays: 21, maxLoans: 5, maxRenewals: 3 },
      create: { libraryId: library.id, name: 'Adult', loanDays: 21, maxLoans: 5, maxRenewals: 3 },
    }),
    prisma.materialType.upsert({
      where: { libraryId_code: { libraryId: library.id, code: 'BOOK' } },
      update: {},
      create: { libraryId: library.id, code: 'BOOK', name: 'Book', loanable: true },
    }),
  ])
  await prisma.circulationPolicy.upsert({
    where: { libraryId_name: { libraryId: library.id, name: 'Standard Adult' } },
    update: { loanDays: 21, maxRenewals: 3 },
    create: { libraryId: library.id, name: 'Standard Adult', loanDays: 21, maxRenewals: 3 },
  })

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
  const classification = await prisma.classification.upsert({ where: { libraryId_scheme_code: { libraryId: library.id, scheme: 'LCC', code: 'FIC' } }, update: {}, create: { libraryId: library.id, scheme: 'LCC', code: 'FIC', label: 'Fiction' } })

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
        classificationId: classification.id,
        subjects: ['Literature', 'Fiction'],
        authors: { create: { authorId: entry.author.id } },
        editions: { create: { id: `${entry.id}-edition`, isbn: entry.isbn, year: entry.year, label: 'Library edition' } },
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
      await prisma.item.upsert({ where: { barcode }, update: { materialTypeId: bookMaterial.id }, create: { holdingId: holding.id, editionId: `${entry.id}-edition`, branchId: branch.id, collectionId: collection.id, materialTypeId: bookMaterial.id, barcode, condition: 'GOOD' } })
    }
  }

  await prisma.member.upsert({
    where: { libraryId_memberNumber: { libraryId: library.id, memberNumber: 'M-10001' } },
    update: {},
    create: { libraryId: library.id, branchId: central.id, categoryId: adultCategory.id, memberNumber: 'M-10001', barcode: 'BNX-M-10001', name: 'Avery Morgan', email: 'avery.morgan@example.com' },
  })

  const permissionKeys = ['catalog:read', 'catalog:write', 'members:read', 'members:write', 'circulation:read', 'circulation:write', 'reports:read', 'settings:write']
  const permissions = await Promise.all(permissionKeys.map((key) => prisma.permission.upsert({ where: { key }, update: {}, create: { key, description: `DEVELOPMENT ONLY — ${key}` } })))
  const roleNames = ['PLATFORM_ADMIN', 'TENANT_ADMIN', 'LIBRARY_ADMIN', 'LIBRARIAN', 'CIRCULATION_MANAGER', 'CIRCULATION_DESK', 'CATALOGER', 'ACQUISITIONS_MANAGER', 'REPORTS_VIEWER']
  for (const roleName of roleNames) {
    const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName, description: `DEVELOPMENT ONLY — ${roleName}` } })
    await Promise.all(permissions.map((permission) => prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } })))
    const user = await prisma.user.upsert({ where: { tenantId_email: { tenantId: tenant.id, email: `${roleName.toLowerCase()}@dev.biblionexus.local` } }, update: {}, create: { tenantId: tenant.id, email: `${roleName.toLowerCase()}@dev.biblionexus.local`, name: `DEVELOPMENT ONLY ${roleName}` } })
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id, libraryId: library.id, branchId: roleName === 'CIRCULATION_DESK' ? central.id : null } }).catch(() => undefined)
  }

  console.log(`Seeded ${tenant.name} with ${library.name}, two branches, catalog records, items, and a demo member.`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect(); await pool.end() })
