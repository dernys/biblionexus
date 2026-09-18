import assert from 'node:assert/strict'
import test from 'node:test'
import { Pool } from 'pg'

const integrationEnabled = process.env.RUN_DB_INTEGRATION === '1'
const pool = integrationEnabled
  ? new Pool({ connectionString: process.env.DATABASE_URL, max: 2 })
  : null

const integrationTest = (name: string, fn: () => void | Promise<void>) => test(name, { skip: !integrationEnabled }, fn)
const fixtureTest = (name: string, fn: () => void | Promise<void>) => test(name, { skip: !integrationEnabled || !process.env.RUN_DB_FIXTURES }, fn)

integrationTest('PostgreSQL integration database is reachable and has applied migrations', async () => {
  assert.ok(pool)
  const result = await pool.query<{ migration_name: string }>(
    'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1',
  )
  assert.ok(result.rows[0]?.migration_name)
})

fixtureTest('tenant fixtures remain isolated by library ownership', async () => {
  assert.ok(pool)
  const result = await pool.query<{ tenant_a: string | null; tenant_b: string | null }>(
    `SELECT
      (SELECT id FROM "Tenant" WHERE slug = 'demo-network' LIMIT 1) AS tenant_a,
      (SELECT id FROM "Tenant" WHERE slug = 'independent-community' LIMIT 1) AS tenant_b`,
  )
  const row = result.rows[0]
  assert.ok(row?.tenant_a)
  assert.ok(row?.tenant_b)
  assert.notEqual(row.tenant_a, row.tenant_b)
})

integrationTest('database backstops exist for active loans and holds', async () => {
  assert.ok(pool)
  const result = await pool.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE schemaname = current_schema()
     AND indexname IN ('Loan_active_item_unique', 'Hold_active_member_record_unique', 'Hold_active_member_item_unique')`,
  )
  const indexes = new Set(result.rows.map((row) => row.indexname))
  assert.ok(indexes.has('Loan_active_item_unique'))
  assert.ok(indexes.has('Hold_active_member_record_unique'))
  assert.ok(indexes.has('Hold_active_member_item_unique'))
})

test.after(async () => {
  await pool?.end()
})
