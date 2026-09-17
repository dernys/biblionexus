DO $$ BEGIN
  CREATE TYPE "CirculationPolicyStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "MemberCategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "BibliographicRecord" ADD COLUMN     "classificationId" TEXT;

-- AlterTable
ALTER TABLE "Item" ADD COLUMN     "materialTypeId" TEXT,
ADD COLUMN     "shelfLocationId" TEXT,
ALTER COLUMN "materialType" DROP NOT NULL,
ALTER COLUMN "materialType" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "categoryId" TEXT,
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "category" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserRole" DROP CONSTRAINT "UserRole_pkey",
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "id" TEXT;

UPDATE "UserRole" SET "id" = md5("userId" || '|' || "roleId");

ALTER TABLE "UserRole" ALTER COLUMN "id" SET NOT NULL,
ADD COLUMN     "libraryId" TEXT,
ADD CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "MemberCategory" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "MemberCategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "maxLoans" INTEGER NOT NULL DEFAULT 5,
    "loanDays" INTEGER NOT NULL DEFAULT 21,
    "maxRenewals" INTEGER NOT NULL DEFAULT 3,

    CONSTRAINT "MemberCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialType" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "loanable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MaterialType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "authorityUri" TEXT,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibliographicSubject" (
    "recordId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,

    CONSTRAINT "BibliographicSubject_pkey" PRIMARY KEY ("recordId","subjectId")
);

-- CreateTable
CREATE TABLE "Classification" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "scheme" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,

    CONSTRAINT "Classification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShelfLocation" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ShelfLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CirculationPolicy" (
    "id" TEXT NOT NULL,
    "libraryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CirculationPolicyStatus" NOT NULL DEFAULT 'ACTIVE',
    "loanDays" INTEGER NOT NULL DEFAULT 21,
    "maxRenewals" INTEGER NOT NULL DEFAULT 3,
    "dailyFine" DECIMAL(65,30) NOT NULL DEFAULT 0.50,
    "graceDays" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CirculationPolicy_pkey" PRIMARY KEY ("id")
);

-- Backfill normalized records without discarding legacy values.
INSERT INTO "MaterialType" ("id", "libraryId", "code", "name")
SELECT md5(i."branchId" || '|' || COALESCE(i."materialType", 'BOOK')), b."libraryId", COALESCE(i."materialType", 'BOOK'), COALESCE(i."materialType", 'BOOK')
FROM "Item" i JOIN "Branch" b ON b."id" = i."branchId"
GROUP BY i."branchId", b."libraryId", i."materialType";

UPDATE "Item" i SET "materialTypeId" = mt."id"
FROM "Branch" b, "MaterialType" mt
WHERE b."id" = i."branchId" AND mt."libraryId" = b."libraryId" AND mt."code" = COALESCE(i."materialType", 'BOOK');

INSERT INTO "MemberCategory" ("id", "libraryId", "name")
SELECT md5(m."libraryId" || '|' || COALESCE(m."category", 'Community')), m."libraryId", COALESCE(m."category", 'Community')
FROM "Member" m GROUP BY m."libraryId", m."category";

UPDATE "Member" m SET "categoryId" = mc."id"
FROM "MemberCategory" mc
WHERE mc."libraryId" = m."libraryId" AND mc."name" = COALESCE(m."category", 'Community');

INSERT INTO "Classification" ("id", "libraryId", "scheme", "code", "label")
SELECT md5(r."libraryId" || '|LCC|' || r."classification"), r."libraryId", 'LCC', r."classification", r."classification"
FROM "BibliographicRecord" r WHERE r."classification" IS NOT NULL
GROUP BY r."libraryId", r."classification";

UPDATE "BibliographicRecord" r SET "classificationId" = c."id"
FROM "Classification" c
WHERE c."libraryId" = r."libraryId" AND c."scheme" = 'LCC' AND c."code" = r."classification";

-- CreateIndex
CREATE UNIQUE INDEX "MemberCategory_libraryId_name_key" ON "MemberCategory"("libraryId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialType_libraryId_code_key" ON "MaterialType"("libraryId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_libraryId_term_key" ON "Subject"("libraryId", "term");

-- CreateIndex
CREATE UNIQUE INDEX "Classification_libraryId_scheme_code_key" ON "Classification"("libraryId", "scheme", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ShelfLocation_branchId_code_key" ON "ShelfLocation"("branchId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "CirculationPolicy_libraryId_name_key" ON "CirculationPolicy"("libraryId", "name");

-- CreateIndex
CREATE INDEX "UserRole_libraryId_branchId_idx" ON "UserRole"("libraryId", "branchId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_libraryId_branchId_key" ON "UserRole"("userId", "roleId", "libraryId", "branchId");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberCategory" ADD CONSTRAINT "MemberCategory_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialType" ADD CONSTRAINT "MaterialType_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibliographicSubject" ADD CONSTRAINT "BibliographicSubject_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "BibliographicRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibliographicSubject" ADD CONSTRAINT "BibliographicSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classification" ADD CONSTRAINT "Classification_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShelfLocation" ADD CONSTRAINT "ShelfLocation_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShelfLocation" ADD CONSTRAINT "ShelfLocation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CirculationPolicy" ADD CONSTRAINT "CirculationPolicy_libraryId_fkey" FOREIGN KEY ("libraryId") REFERENCES "Library"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MemberCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibliographicRecord" ADD CONSTRAINT "BibliographicRecord_classificationId_fkey" FOREIGN KEY ("classificationId") REFERENCES "Classification"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_materialTypeId_fkey" FOREIGN KEY ("materialTypeId") REFERENCES "MaterialType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_shelfLocationId_fkey" FOREIGN KEY ("shelfLocationId") REFERENCES "ShelfLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
