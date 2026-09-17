export const PLATFORM_ROLES = ['PLATFORM_ADMIN', 'TENANT_ADMIN'] as const
export const LIBRARY_ROLES = ['LIBRARY_ADMIN', 'LIBRARIAN', 'CIRCULATION_MANAGER', 'CIRCULATION_DESK', 'CATALOGER', 'ACQUISITIONS_MANAGER', 'REPORTS_VIEWER'] as const

export type PlatformRole = (typeof PLATFORM_ROLES)[number]
export type LibraryRole = (typeof LIBRARY_ROLES)[number]

export interface AuthorizationContext {
  userId: string
  tenantId: string
  libraryIds: string[]
  branchIds: string[]
  platformRole?: PlatformRole
  libraryRoles: LibraryRole[]
}

export function assertTenantAccess(context: AuthorizationContext, tenantId: string) {
  if (context.tenantId !== tenantId) throw new Error('Tenant access denied')
}

export function assertLibraryAccess(context: AuthorizationContext, libraryId: string) {
  if (context.platformRole === 'PLATFORM_ADMIN' || context.platformRole === 'TENANT_ADMIN') return
  if (!context.libraryIds.includes(libraryId)) throw new Error('Library access denied')
}

export function assertBranchAccess(context: AuthorizationContext, branchId: string) {
  if (context.platformRole === 'PLATFORM_ADMIN' || context.platformRole === 'TENANT_ADMIN') return
  if (!context.branchIds.includes(branchId)) throw new Error('Branch access denied')
}

export function requireRole(context: AuthorizationContext, roles: readonly string[]) {
  const isAdmin = context.platformRole === 'PLATFORM_ADMIN' || context.platformRole === 'TENANT_ADMIN'
  if (!isAdmin && !context.libraryRoles.some((role) => roles.includes(role))) {
    throw new Error('Permission denied')
  }
}

export function requireCirculationAccess(context: AuthorizationContext) {
  requireRole(context, ['LIBRARY_ADMIN', 'CIRCULATION_MANAGER', 'CIRCULATION_DESK'])
}

export function requireCatalogAccess(context: AuthorizationContext) {
  requireRole(context, ['LIBRARY_ADMIN', 'CATALOGER'])
}

export function requireReportsAccess(context: AuthorizationContext) {
  requireRole(context, ['LIBRARY_ADMIN', 'REPORTS_VIEWER'])
}

export function scopedWhere(context: AuthorizationContext, scope: { tenantId?: string; libraryId?: string; branchId?: string }) {
  if (scope.tenantId) assertTenantAccess(context, scope.tenantId)
  if (scope.libraryId) assertLibraryAccess(context, scope.libraryId)
  if (scope.branchId) assertBranchAccess(context, scope.branchId)
  return scope
}
// Authentication/session resolution is intentionally kept separate until BETTER_AUTH_SECRET is configured.
// Callers must resolve AuthorizationContext server-side before invoking domain services.
