import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'

const enabled = process.env.RUN_DB_INTEGRATION === '1' && process.env.RUN_DB_FIXTURES === '1'
const pool = enabled ? new Pool({ connectionString: process.env.DATABASE_URL, max: 6 }) : null
const integrationTest = (name: string, fn: () => void | Promise<void>) => test(name, { skip: !enabled }, fn)

async function fixture(client: PoolClient) {
  const result = await client.query<{ tenant_id: string; library_id: string; branch_id: string; member_id: string; item_id: string }>(`
    SELECT t.id AS tenant_id, l.id AS library_id, b.id AS branch_id, m.id AS member_id, i.id AS item_id
    FROM "Tenant" t
    JOIN "Library" l ON l."tenantId" = t.id
    JOIN "Branch" b ON b."libraryId" = l.id
    JOIN "Member" m ON m."libraryId" = l.id
    JOIN "Item" i ON i."branchId" = b.id
    WHERE t.slug = 'demo-network' AND i.status = 'AVAILABLE'
    LIMIT 1
  `)
  assert.ok(result.rows[0], 'expected an available demo-network fixture item')
  return result.rows[0]
}

integrationTest('active loan unique index rejects a competing checkout', async () => {
  assert.ok(pool)
  const client = await pool.connect()
  try {
    const ids = await fixture(client)
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO "Loan" (id, "memberId", "itemId", "branchId", status, "loanDate", "dueDate")
       VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW() + INTERVAL '21 days')`,
      [randomUUID(), ids.member_id, ids.item_id, ids.branch_id],
    )
    await client.query('COMMIT')
    await assert.rejects(
      client.query(
        `INSERT INTO "Loan" (id, "memberId", "itemId", "branchId", status, "loanDate", "dueDate")
         VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW() + INTERVAL '21 days')`,
        [randomUUID(), ids.member_id, ids.item_id, ids.branch_id],
      ),
      (error: unknown) => (error as { code?: string }).code === '23505',
    )
  } finally {
    await client.query('ROLLBACK').catch(() => undefined)
    await client.query('DELETE FROM "Loan" WHERE "itemId" = $1', [((await fixture(client)).item_id)]).catch(() => undefined)
    client.release()
  }
})

integrationTest('transaction rollback leaves no loan or item mutation', async () => {
  assert.ok(pool)
  const client = await pool.connect()
  try {
    const ids = await fixture(client)
    await client.query('BEGIN')
    await client.query(
      `INSERT INTO "Loan" (id, "memberId", "itemId", "branchId", status, "loanDate", "dueDate")
       VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW() + INTERVAL '21 days')`,
      [randomUUID(), ids.member_id, ids.item_id, ids.branch_id],
    )
    await client.query('ROLLBACK')
    const result = await client.query('SELECT COUNT(*)::int AS count FROM "Loan" WHERE "itemId" = $1 AND status IN (\'ACTIVE\', \'OVERDUE\')', [ids.item_id])
    assert.equal(result.rows[0].count, 0)
  } finally {
    client.release()
  }
})

test.after(async () => { await pool?.end() })
