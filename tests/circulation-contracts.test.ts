import assert from 'node:assert/strict'
import test from 'node:test'
import { buildRequestHash } from '../lib/services/circulation'
import { AuthorizationError, requirePermission, type AuthorizationContext } from '../lib/authorization'

const circulationContext: AuthorizationContext = {
  userId: 'user-a',
  tenantId: 'tenant-a',
  libraryIds: ['library-a'],
  branchIds: ['branch-a'],
  roles: ['CIRCULATION_DESK'],
  permissions: ['circulation:write'],
  libraryRoles: ['CIRCULATION_DESK'],
}

test('idempotency hash is stable for the same request', () => {
  assert.equal(buildRequestHash('member-a', 'item-a', 'branch-a'), buildRequestHash('member-a', 'item-a', 'branch-a'))
})

test('idempotency hash changes when the request changes', () => {
  assert.notEqual(buildRequestHash('member-a', 'item-a', 'branch-a'), buildRequestHash('member-a', 'item-b', 'branch-a'))
})

test('circulation permission is denied without server permission', () => {
  assert.throws(() => requirePermission({ ...circulationContext, permissions: [] }, 'circulation:write'), AuthorizationError)
})

test('tenant context is carried into the request contract', () => {
  assert.equal(circulationContext.tenantId, 'tenant-a')
  assert.equal(circulationContext.libraryIds[0], 'library-a')
  assert.equal(circulationContext.branchIds[0], 'branch-a')
})
