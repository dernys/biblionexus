-- Prevent duplicate active holds for the same member and target under concurrency.
CREATE UNIQUE INDEX IF NOT EXISTS "Hold_active_member_record_unique"
ON "Hold" ("memberId", "recordId")
WHERE "recordId" IS NOT NULL AND "status" IN ('QUEUED', 'READY');

CREATE UNIQUE INDEX IF NOT EXISTS "Hold_active_member_item_unique"
ON "Hold" ("memberId", "itemId")
WHERE "itemId" IS NOT NULL AND "status" IN ('QUEUED', 'READY');

-- Keep target lookup and queue ordering efficient.
CREATE INDEX IF NOT EXISTS "Hold_record_status_created_idx"
ON "Hold" ("recordId", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "Hold_item_status_created_idx"
ON "Hold" ("itemId", "status", "createdAt");
