'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requirePermission, requireSession, requireTenantScope, type AuthorizationContext } from '@/lib/authorization'
import type { Prisma } from '@/lib/generated/prisma/client'

const USER_MANAGE = 'users:manage'

async function adminContext() {
  const context = await requireSession()
  return requirePermission(context, USER_MANAGE)
}

export async function listAdminUsers(query = '') {
  const context = await adminContext()
  return prisma.user.findMany({
    where: { tenantId: context.tenantId, ...(query ? { OR: [{ name: { contains: query, mode: 'insensitive' } }, { email: { contains: query, mode: 'insensitive' } }] } : {}) },
    select: { id: true, name: true, email: true, status: true, createdAt: true, roles: { include: { role: true, library: true, branch: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function listRolesAndPermissions() {
  await adminContext()
  return prisma.role.findMany({ include: { permissions: { include: { permission: true } }, _count: { select: { users: true } } }, orderBy: { name: 'asc' } })
}

export async function updateUserStatus(userId: string, status: 'ACTIVE' | 'INACTIVE') {
  const context = await adminContext()
  const target = await prisma.user.findFirst({ where: { id: userId, tenantId: context.tenantId }, select: { id: true, status: true } })
  if (!target) throw new Error('User not found in tenant scope')
  const updated = await prisma.user.update({ where: { id: target.id }, data: { status } })
  await audit(context, 'USER_STATUS_UPDATED', userId, { status: target.status }, { status })
  revalidatePath('/admin/users')
  return updated
}

export async function assignUserRole(input: { userId: string; roleId: string; libraryId?: string; branchId?: string }) {
  const context = await adminContext()
  const [target, role] = await Promise.all([
    prisma.user.findFirst({ where: { id: input.userId, tenantId: context.tenantId }, select: { id: true } }),
    prisma.role.findUnique({ where: { id: input.roleId }, select: { id: true, name: true } }),
  ])
  if (!target || !role) throw new Error('Invalid user or role')
  if (role.name === 'PLATFORM_ADMIN' && context.platformRole !== 'PLATFORM_ADMIN') throw new Error('Privilege escalation denied')
  if (input.libraryId) {
    const library = await prisma.library.findFirst({ where: { id: input.libraryId, tenantId: context.tenantId }, select: { id: true } })
    if (!library) throw new Error('Library is outside tenant scope')
  }
  if (input.branchId) {
    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, library: { tenantId: context.tenantId }, ...(input.libraryId ? { libraryId: input.libraryId } : {}) }, select: { id: true } })
    if (!branch) throw new Error('Branch is outside library scope')
  }
  const assignment = await prisma.userRole.create({ data: { userId: target.id, roleId: role.id, libraryId: input.libraryId, branchId: input.branchId } })
  await audit(context, 'USER_ROLE_ASSIGNED', input.userId, null, input)
  revalidatePath('/admin/users')
  return assignment
}

async function audit(context: AuthorizationContext, action: string, entityId: string, before: unknown, after: unknown) {
  await prisma.auditLog.create({ data: { tenantId: context.tenantId, userId: context.userId, action, entity: 'User', entityId, before: before === null ? undefined : JSON.parse(JSON.stringify(before)) as Prisma.InputJsonValue, after: JSON.parse(JSON.stringify(after)) as Prisma.InputJsonValue } })
}

export async function getAdminScope() {
  const context = await adminContext()
  requireTenantScope(context, context.tenantId)
  return prisma.library.findMany({ where: { tenantId: context.tenantId }, select: { id: true, name: true, branches: { select: { id: true, name: true, code: true } } }, orderBy: { name: 'asc' } })
}

export type AdminUser = Awaited<ReturnType<typeof listAdminUsers>>[number]
export type AdminRole = Awaited<ReturnType<typeof listRolesAndPermissions>>[number]
export type AdminScope = Awaited<ReturnType<typeof getAdminScope>>
