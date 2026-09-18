import { hashPassword } from 'better-auth/crypto'
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
  const roleNames = ['PLATFORM_ADMIN', 'TENANT_ADMIN', 'LIBRARY_ADMIN', 'LIBRARIAN', 'NORMAL_USER', 'CIRCULATION_MANAGER', 'CIRCULATION_DESK', 'CATALOGER', 'ACQUISITIONS_MANAGER', 'REPORTS_VIEWER']
  for (const roleName of roleNames) {
    const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName, description: `DEVELOPMENT ONLY — ${roleName}` } })
    await Promise.all(permissions.map((permission) => prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } }, update: {}, create: { roleId: role.id, permissionId: permission.id } })))
    const user = await prisma.user.upsert({ where: { tenantId_email: { tenantId: tenant.id, email: `${roleName.toLowerCase()}@dev.biblionexus.local` } }, update: {}, create: { tenantId: tenant.id, email: `${roleName.toLowerCase()}@dev.biblionexus.local`, name: `DEVELOPMENT ONLY ${roleName}` } })
    await prisma.userRole.create({ data: { userId: user.id, roleId: role.id, libraryId: library.id, branchId: roleName === 'CIRCULATION_DESK' ? central.id : null } }).catch(() => undefined)
  }

  const superadminEmail = 'superadmin@dev.biblionexus.local'
  const superadminPassword = 'BiblioNexus.Dev.2026!'
  const superadmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: superadminEmail } },
    update: { name: 'DEVELOPMENT ONLY Superadmin', status: 'ACTIVE', emailVerified: true },
    create: {
      tenantId: tenant.id,
      email: superadminEmail,
      name: 'DEVELOPMENT ONLY Superadmin',
      status: 'ACTIVE',
      emailVerified: true,
    },
  })
  const superadminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'PLATFORM_ADMIN' } })
  const existingSuperadminRole = await prisma.userRole.findFirst({
    where: { userId: superadmin.id, roleId: superadminRole.id, libraryId: null, branchId: null },
  })
  if (!existingSuperadminRole) {
    await prisma.userRole.create({ data: { userId: superadmin.id, roleId: superadminRole.id } })
  }
  const superadminAccount = await prisma.account.findFirst({ where: { userId: superadmin.id, providerId: 'credential' } })
  if (!superadminAccount) {
    await prisma.account.create({
      data: {
        id: `${superadmin.id}-credential`,
        userId: superadmin.id,
        accountId: superadmin.id,
        providerId: 'credential',
        password: await hashPassword(superadminPassword),
      },
    })
  }

  const defaultUsers = [
    { role: 'PLATFORM_ADMIN', email: 'superadmin@dev.biblionexus.local', name: 'DEVELOPMENT ONLY Superadmin', password: 'BiblioNexus.Dev.2026!' },
    { role: 'TENANT_ADMIN', email: 'administrator@dev.biblionexus.local', name: 'DEVELOPMENT ONLY Administrator', password: 'BiblioNexus.Admin.2026!' },
    { role: 'LIBRARIAN', email: 'librarian@dev.biblionexus.local', name: 'DEVELOPMENT ONLY Librarian', password: 'BiblioNexus.Librarian.2026!' },
    { role: 'NORMAL_USER', email: 'user@dev.biblionexus.local', name: 'DEVELOPMENT ONLY Normal User', password: 'BiblioNexus.User.2026!' },
  ] as const
  for (const account of defaultUsers) {
    const role = await prisma.role.findUniqueOrThrow({ where: { name: account.role } })
    const user = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: account.email } },
      update: { name: account.name, status: 'ACTIVE', emailVerified: true },
      create: { tenantId: tenant.id, email: account.email, name: account.name, status: 'ACTIVE', emailVerified: true },
    })
    const assignment = await prisma.userRole.findFirst({ where: { userId: user.id, roleId: role.id, libraryId: library.id } })
    if (!assignment) await prisma.userRole.create({ data: { userId: user.id, roleId: role.id, libraryId: library.id } })
    const credential = await prisma.account.findFirst({ where: { userId: user.id, providerId: 'credential' } })
    if (!credential) {
      await prisma.account.create({ data: { id: `${user.id}-credential`, userId: user.id, accountId: user.id, providerId: 'credential', password: await hashPassword(account.password) } })
    }
    console.log(`DEVELOPMENT ONLY ${account.role}: ${account.email} / ${account.password}`)
  }

  const tenantB = await prisma.tenant.upsert({ where: { slug: 'independent-community' }, update: {}, create: { name: 'Independent Community Library', slug: 'independent-community' } })
  const networkB = await prisma.libraryNetwork.upsert({ where: { id: `${tenantB.id}-network` }, update: {}, create: { id: `${tenantB.id}-network`, tenantId: tenantB.id, name: 'Independent Community Network' } })
  const libraryB = await prisma.library.upsert({ where: { tenantId_slug: { tenantId: tenantB.id, slug: 'community-library' } }, update: { networkId: networkB.id }, create: { tenantId: tenantB.id, networkId: networkB.id, name: 'Community Library', slug: 'community-library' } })
  const branchB = await prisma.branch.upsert({ where: { libraryId_code: { libraryId: libraryB.id, code: 'COM' } }, update: {}, create: { libraryId: libraryB.id, name: 'Community Branch', code: 'COM', address: '1 Community Way' } })
  const categoryB = await prisma.memberCategory.upsert({ where: { libraryId_name: { libraryId: libraryB.id, name: 'Adult' } }, update: {}, create: { libraryId: libraryB.id, name: 'Adult' } })
  await prisma.member.upsert({ where: { libraryId_memberNumber: { libraryId: libraryB.id, memberNumber: 'B-10001' } }, update: {}, create: { libraryId: libraryB.id, branchId: branchB.id, categoryId: categoryB.id, memberNumber: 'B-10001', name: 'Jordan Lee', email: 'jordan.lee@community.example' } })

  console.log(`Seeded ${tenant.name} with ${library.name}, two branches, catalog records, items, and a demo member.`)
  console.log(`Seeded independent tenant ${tenantB.name} with library ${libraryB.name} and member B-10001.`)
  console.log(`DEVELOPMENT ONLY superadmin: ${superadminEmail} / ${superadminPassword}`)
}

main().catch((error) => { console.error(error); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect(); await pool.end() })
