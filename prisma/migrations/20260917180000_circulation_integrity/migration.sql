-- Prevent two active/overdue loans for the same physical item under concurrency.
CREATE UNIQUE INDEX IF NOT EXISTS "Loan_active_item_unique"
ON "Loan" ("itemId")
WHERE "status" IN ('ACTIVE', 'OVERDUE');

-- Ensure idempotency records expire efficiently by tenant.
CREATE INDEX IF NOT EXISTS "IdempotencyKey_tenant_expires_idx"
ON "IdempotencyKey" ("tenantId", "expiresAt");
