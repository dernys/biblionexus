
export const PLATFORM_ROLES = ['PLATFORM_ADMIN', 'TENANT_ADMIN'] as const
export const LIBRARY_ROLES = ['LIBRARY_ADMIN', 'LIBRARIAN', 'CIRCULATION_MANAGER', 'CIRCULATION_DESK', 'CATALOGER', 'ACQUISITIONS_MANAGER', 'REPORTS_VIEWER'] as const

export type PlatformRole = (typeof PLATFORM_ROLES)[number]
export type LibraryRole = (typeof LIBRARY_ROLES)[number]

export interface AuthorizationContext {
  userId: string
  tenantId: string
  libraryIds: readonly string[]
  branchIds: readonly string[]
  roles: readonly string[]
  permissions: readonly string[]
  platformRole?: PlatformRole
  libraryRoles: readonly LibraryRole[]
}

export class AuthorizationError extends Error {
  constructor(message = 'Authorization denied') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export async function requireSession(): Promise<AuthorizationContext> {
  if (!process.env.BETTER_AUTH_SECRET) throw new AuthorizationError('Authentication is not configured')
  const { getAuthorizationContext } = await import('@/lib/authorization-context')
  const context = await getAuthorizationContext()
  if (!context) throw new AuthorizationError('Unauthorized')
  return context
}

export function requirePermission(context: AuthorizationContext, permission: string) {
  if (context.platformRole === 'PLATFORM_ADMIN' || context.permissions.includes('*') || context.permissions.includes(permission)) return context
  throw new AuthorizationError(`Missing permission: ${permission}`)
}

export function requireTenantScope(context: AuthorizationContext, tenantId: string) {
  if (context.tenantId !== tenantId) throw new AuthorizationError('Tenant scope denied')
  return context
}

export function requireLibraryScope(context: AuthorizationContext, libraryId: string) {
  requireTenantScope(context, context.tenantId)
  if (context.platformRole === 'PLATFORM_ADMIN' || context.platformRole === 'TENANT_ADMIN') return context
  if (!context.libraryIds.includes(libraryId)) throw new AuthorizationError('Library scope denied')
  return context
}

export function requireBranchScope(context: AuthorizationContext, branchId: string) {
  if (context.platformRole === 'PLATFORM_ADMIN' || context.platformRole === 'TENANT_ADMIN') return context
  if (!context.branchIds.includes(branchId)) throw new AuthorizationError('Branch scope denied')
  return context
}

export function requireRole(context: AuthorizationContext, roles: readonly string[]) {
  if (context.platformRole === 'PLATFORM_ADMIN' || context.platformRole === 'TENANT_ADMIN') return context
  if (roles.some((role) => context.roles.includes(role) || context.libraryRoles.includes(role as LibraryRole))) return context
  throw new AuthorizationError('Role denied')
}

export function requireCirculationAccess(context: AuthorizationContext) {
  return requirePermission(context, 'circulation:write')
}

export function scopedWhere(context: AuthorizationContext, scope: { tenantId: string; libraryId?: string; branchId?: string }) {
  requireTenantScope(context, scope.tenantId)
  if (scope.libraryId) requireLibraryScope(context, scope.libraryId)
  if (scope.branchId) requireBranchScope(context, scope.branchId)
  return scope
}

export async function requestHeaders() {
  return headers()
}

export function assertTenantAccess(context: AuthorizationContext, tenantId: string) { return requireTenantScope(context, tenantId) }
export function assertLibraryAccess(context: AuthorizationContext, libraryId: string) { return requireLibraryScope(context, libraryId) }
export function assertBranchAccess(context: AuthorizationContext, branchId: string) { return requireBranchScope(context, branchId) }
