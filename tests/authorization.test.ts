import assert from 'node:assert/strict'
import test from 'node:test'
import { AuthorizationError, requireBranchScope, requireLibraryScope, requirePermission, requireTenantScope, requireRole, type AuthorizationContext } from '../lib/authorization'

const context: AuthorizationContext = { userId: 'user-a', tenantId: 'tenant-a', libraryIds: ['library-a'], branchIds: ['branch-a'], roles: ['CIRCULATION_DESK'], permissions: ['circulation:write'], libraryRoles: ['CIRCULATION_DESK'] }

test('tenant isolation denies another tenant', () => assert.throws(() => requireTenantScope(context, 'tenant-b'), AuthorizationError))
test('library isolation denies another library', () => assert.throws(() => requireLibraryScope(context, 'library-b'), AuthorizationError))
test('branch isolation denies another branch', () => assert.throws(() => requireBranchScope(context, 'branch-b'), AuthorizationError))
test('permission is evaluated server-side', () => assert.throws(() => requirePermission({ ...context, permissions: [] }, 'circulation:write'), AuthorizationError))
test('role is not inferred from a client supplied id', () => assert.throws(() => requireRole({ ...context, roles: [], libraryRoles: [] }, ['CIRCULATION_DESK']), AuthorizationError))
test('authorized circulation context passes all guards', () => { requireTenantScope(context, 'tenant-a'); requireLibraryScope(context, 'library-a'); requireBranchScope(context, 'branch-a'); requirePermission(context, 'circulation:write') })
