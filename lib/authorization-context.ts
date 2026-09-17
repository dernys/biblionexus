import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { AuthorizationContext } from '@/lib/authorization'

export async function getAuthorizationContext(): Promise<AuthorizationContext | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null

  const assignments = await prisma.userRole.findMany({
    where: { userId: session.user.id },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  })

  const tenantId = (await prisma.user.findUnique({ where: { id: session.user.id }, select: { tenantId: true } }))?.tenantId
  if (!tenantId) return null

  const roles = assignments.map((assignment) => assignment.role.name)
  const permissions = assignments.flatMap((assignment) => assignment.role.permissions.map(({ permission }) => permission.key))
  const libraryIds = new Set(assignments.flatMap(({ libraryId }) => libraryId ? [libraryId] : []))
  const branchIds = new Set(assignments.flatMap(({ branchId }) => branchId ? [branchId] : []))

  return {
    userId: session.user.id,
    tenantId,
    libraryIds,
    branchIds,
    roles,
    permissions,
    platformRole: roles.includes('PLATFORM_ADMIN') ? 'PLATFORM_ADMIN' : undefined,
    libraryRoles: assignments.map(({ role }) => role.name).filter((role): role is import('@/lib/authorization').LibraryRole => role !== 'PLATFORM_ADMIN' && role !== 'TENANT_ADMIN'),
  }
}

export async function requireAuthorizationContext() {
  const context = await getAuthorizationContext()
  if (!context) throw new Error('Unauthorized')
  return context
}
