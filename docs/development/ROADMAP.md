# BiblioNexus - Interface Development Roadmap

**Status**: Reconciled roadmap; implementation remains partial  
**Target**: Enterprise-ready multi-tenant ILS with verified UI, services, persistence, authorization, audit and tests  
**Canonical progress**: Not calculated; no percentage is published without complete evidence  
**Last Updated**: 2026-09-17
**Owner**: CTO / Principal Architecture
**Canonical rule**: this file is the delivery source of truth; statuses are evidence-based and override historical cycle labels below.

## CTO Audit — Current Reality and Target Completion Plan

### Executive assessment
BiblioNexus has a credible ILS domain model, PostgreSQL migrations, Prisma 7, a service/repository direction, bilingual dashboard/catalog surfaces, and partial circulation transactions. It is not production-ready yet. The critical remaining work is not additional screens: it is real Better Auth session integration, database-enforced scope integrity, complete service boundaries, PostgreSQL integration/concurrency tests, and connecting the operational UI to those services.

### Evidence-based status vocabulary
- **DONE**: real flow connected end-to-end, authorization enforced server-side, persistence transactional, audit/idempotency covered, tests and build pass.
- **PARTIAL**: meaningful implementation exists but one or more acceptance gates are missing.
- **NEEDS_REVIEW**: implementation exists but schema/security correctness requires explicit review.
- **BLOCKED**: cannot be completed safely because a prerequisite or environment is missing.
- **MOCK/STATIC**: UI or data is illustrative and must not be treated as operational capability.

### Architecture decisions to preserve
1. Keep the pipeline `UI → Server Action/Route Handler → AuthorizationContext → Application Service → Repository → Prisma/PostgreSQL`.
2. Components must never import Prisma or perform authorization decisions.
3. Every repository method receives explicit tenant scope and optional library/branch scope; there are no unscoped `getAll*` methods.
4. All circulation mutations use a transaction, idempotency key, audit event, and database concurrency backstop.
5. English is the canonical domain/API language; all user-facing interfaces must support English and Spanish through a shared translation namespace, not duplicated ad-hoc strings.
6. Design direction remains premium operational software: warm amber accent, deep navy shell, restrained surfaces, dense but readable tables, keyboard-accessible actions, responsive layouts, and visible empty/loading/error states.

### Schema audit findings
- **Verified**: PostgreSQL datasource, tenant → library → branch hierarchy, scoped Member/Record models, unique library member numbers, unique item barcodes, active-loan partial index, active-hold partial indexes, idempotency model, audit model, renewal events.
- **NEEDS_REVIEW**: `Holding.branchId` has no Prisma `Branch` relation or foreign key. This prevents the database from proving that a holding belongs to the branch represented by its items.
- **NEEDS_REVIEW**: `Item.branchId` and `Item.holdingId` are independently constrained; a composite compatibility constraint is required so an item cannot point to a holding from another branch.
- **NEEDS_REVIEW**: `Member.libraryId` and nullable `Member.branchId` do not have a composite FK proving branch/library compatibility.
- **NEEDS_REVIEW**: `Loan.memberId`, `Loan.itemId`, and `Loan.branchId` are separate relations; composite scope constraints are required for member/library, item/branch, and loan branch consistency.
- **NEEDS_REVIEW**: `Library.networkId` is nullable and does not prove the network belongs to the same tenant.
- **NEEDS_REVIEW**: global `Author` and `Publisher` ownership must be an explicit ADR decision; records are library-scoped while these authority entities are currently global.
- **SECURITY REVIEW**: `Account` contains credential/token fields; Better Auth adapter behavior, encryption/redaction, session revocation, and production secret handling must be verified before Auth can be DONE.

### Definition of Done for the P0 operational core
A capability may only move to DONE when it has: real Better Auth session; tenant/library/branch authorization; input validation; repository-scoped queries; Prisma transaction; idempotency where retryable; audit log; PostgreSQL integration/concurrency test; bilingual connected UI where applicable; and passing `db:check`, typecheck, lint, tests, and build.

## P0 Reality Check — Prisma, PostgreSQL, Security, Circulation

| Area | Before | After | Status |
|---|---|---|---|
| Foundation | PARTIAL | Prisma/PostgreSQL migrations exist; runtime validation verified | PARTIAL |
| Auth/RBAC | PARTIAL | Better Auth context and server-side permission guards verified by tests | PARTIAL |
| Catalog | PARTIAL | Tenant/library-scoped repository-backed catalog list | PARTIAL |
| Circulation | MOCK/PARTIAL | Transactional checkout, return, renew and hold service paths with idempotency and audit writes | PARTIAL |
| Members | STATIC | Member lookup is used by circulation; member CRUD remains absent | PARTIAL |
| OPAC | MISSING | Not implemented in this iteration | MISSING |
| Audit | PARTIAL | Checkout/return/renew/hold audit writes exist; payment/waiver and mutation coverage remain | PARTIAL |
| Testing | PARTIAL | 6 authorization tests pass; integration database tests remain | PARTIAL |

**Implemented**: `lib/repositories/circulation.ts` scoped repository functions, checkout/return/renew/hold transaction paths, active-loan partial unique index migration, idempotency request-hash validation for checkout/return/renew/hold, overdue ledger CHARGE creation, and independent Tenant B seed data.
**Verified**: `prisma validate`, `prisma generate`, `prisma migrate status`, `typecheck`, existing tests, production build; protected admin routing now requires both an authenticated Better Auth session and a resolved tenant authorization context; sign-in UI supports English and Spanish.
**Current iteration**: server route `/[...slug]` now rejects sessions without a valid tenant context before loading admin data; `AuthForm` exposes bilingual labels and language selection without weakening server authorization. Added `tests/circulation-contracts.test.ts` for stable/different idempotency hashes and server-side circulation permission denial; this contract layer does not replace PostgreSQL integration tests.
**Needs Review**: composite database constraints for cross-entity library/branch compatibility, full seed scenario, payment/waiver operations, integration tests against PostgreSQL.
**Blocked**: OPAC public flow and browser validation require the corresponding route/runtime verification.
**Next**: add PostgreSQL integration tests and complete composite integrity constraints before expanding circulation UI.

**Latest delivery (2026-09-17)**: Added `tests/circulation-contracts.test.ts` and exported the typed `buildRequestHash` contract. The suite now verifies deterministic idempotency hashes, changed-request differentiation, tenant context presence and server-side circulation permission denial. Added `tests/postgres-integrity.test.ts` and `test:integration` scripts. The connected database passed migration reachability, active-loan/hold index checks, and reproducible Tenant A/B fixture isolation (3 passed, 0 skipped). `pnpm db:seed` now loads the independent fixture safely through upserts. These gates do not yet claim mutation concurrency or rollback coverage.

**Iteration follow-up (2026-09-17)**: Added PostgreSQL partial unique indexes preventing duplicate active holds per member/record and member/item, plus queue lookup indexes. Migration `20260917193000_hold_integrity` was applied successfully to the connected PostgreSQL database; `prisma migrate status` reports the database is up to date. This is a database backstop; integration tests and cross-entity composite constraints remain PARTIAL.

> This roadmap is a delivery plan, not proof of implementation. Each item must be classified REAL, PARTIAL, DEMO, MOCK, or MISSING using the matrix in `DEVELOPMENT.md`. Do not mark a capability COMPLETE until the Definition of Done is satisfied.

---

## Schema Analysis Summary

### Core Data Models
- **Multi-tenant**: Tenant → LibraryNetwork → Library → Branch hierarchy
- **Identity**: User (with Better Auth), roles, permissions, audit
- **Catalog**: BibliographicRecord → Edition → Item → Holding
- **Circulation**: Member → Loan/Hold/Fine workflow
- **Admin**: Organization, settings, policies, categories

### Key Relationships
```
Tenant
├── LibraryNetwork
├── Library (has Branch, Collections, Members, Records)
├── Users (with scoped roles per Library/Branch)
└── AuditLogs

Catalog Core
├── BibliographicRecord
│   ├── Authors (BibliographicAuthor many-to-many)
│   ├── Subjects (BibliographicSubject many-to-many)
│   ├── Publisher
│   ├── Classification
│   └── Editions
│       └── Items (with ItemStatusHistory)
│           └── Holdings

Circulation
├── Members (scoped by Library/Branch)
├── Loans (Item + Member + Branch)
├── Holds (Item/Record + Member)
├── Fines + Payments
└── Policies (MemberCategory + CirculationPolicy)

Admin
├── MemberCategories (per Library)
├── MaterialTypes (per Library)
├── Subjects (per Library)
├── Classifications (per Library)
├── ShelfLocations (per Library + Branch)
├── CirculationPolicies (per Library)
└── LibrarySettings
```

---

## Cycle 3: Multi-Tenancy & Organization Structure

### Goal
Implement organization, tenant, library, and branch management with proper scoping and RBAC integration.

### Tasks

#### 3.1 Tenant Management Interface
**Scope**: Admin only (PLATFORM_ADMIN)
- **Route**: `/admin/tenants`
- **Components**:
  - `TenantList`: Table with tenant name, slug, library count, user count, creation date
  - `TenantDetail`: Read-only display (edit minimal for production safety)
  - Search/filter by name
- **Actions** (server):
  - `listTenants` (paginated)
  - `getTenantById`
  - View associated users, libraries
- **Validation**: Tenant slug uniqueness, email format
- **RBAC**: PLATFORM_ADMIN only
- **Audit**: Tenant creation, modification logged
- **Status**: PARTIAL (listed in seed, needs UI)

#### 3.2 Library Network Management
**Scope**: PLATFORM_ADMIN (full), LIBRARY_ADMIN (read own networks)
- **Route**: `/admin/libraries/networks`
- **Components**:
  - `NetworkList`: Table with network name, tenant, library count
  - `NetworkForm`: Create/edit form (name)
  - `NetworkDetail`: View associated libraries
- **Actions** (server):
  - `listLibraryNetworks`
  - `createLibraryNetwork`
  - `updateLibraryNetwork`
  - `deleteLibraryNetwork` (only if no libraries)
- **Validation**: Name required, association to tenant
- **RBAC**: PLATFORM_ADMIN (all), LIBRARY_ADMIN (own tenant)
- **Audit**: Creation, updates, deletions
- **Status**: NOT STARTED

#### 3.3 Library Management
**Scope**: PLATFORM_ADMIN, LIBRARY_ADMIN
- **Route**: `/admin/libraries`
- **Components**:
  - `LibraryList`: Table (name, slug, tenant, branches, members, records)
  - `LibraryForm`: Create/edit form (name, slug, network, tenant)
  - `LibraryDetail`: View overview, branches, users, collections
  - Drill-down from tenant view
- **Actions** (server):
  - `listLibraries` (with tenant + library scope)
  - `createLibrary`
  - `updateLibrary`
  - `getLibraryStats`
- **Validation**: Slug uniqueness per tenant, name required
- **RBAC**: PLATFORM_ADMIN (all), LIBRARY_ADMIN (own libraries)
- **Audit**: CRUD operations
- **Status**: NOT STARTED

#### 3.4 Branch Management
**Scope**: LIBRARY_ADMIN, BRANCH_MANAGER
- **Route**: `/admin/branches`
- **Components**:
  - `BranchList`: Table (code, name, address, library, item count, member count)
  - `BranchForm`: Create/edit form (name, code, address, library)
  - `BranchDetail`: View overview, shelf locations, members assigned
- **Actions** (server):
  - `listBranches` (with library scope)
  - `createBranch`
  - `updateBranch`
  - `deleteBranch` (only if no items/members)
- **Validation**: Code uniqueness per library, name required
- **RBAC**: LIBRARY_ADMIN (all branches of library), BRANCH_MANAGER (own branch read)
- **Audit**: CRUD operations
- **Status**: NOT STARTED

#### 3.5 Organization Context State
**Scope**: App shell + all admin pages
- **State**: Current tenant, library, branch selection
- **Storage**: URL query params + localStorage for user preference
- **Components**:
  - `OrganizationSelector`: Dropdown for tenant/library/branch
  - Breadcrumb showing: Tenant > LibraryNetwork > Library > Branch
- **Behavior**:
  - On login: resolve user's libraries/branches, set default
  - On navigation: preserve context, update available scopes
  - On logout: clear context
- **Status**: PARTIAL (basic navigation exists)

---

## Cycle 4: Catalog Foundation

### Goal
Implement bibliographic record management with authors, publishers, subjects, and classifications.

### Tasks

#### 4.1 Bibliographic Records - List & Search
**Scope**: CATALOGER, LIBRARIAN, PUBLIC (search only, no edit)
**Status**: PARTIAL — scoped Prisma read service and bilingual responsive list/search UI implemented; detail, server-side filters, pagination and mutations remain.
**Implementation**: `lib/services/catalog.ts`, `components/catalog-records.tsx`, `app/[...slug]/page.tsx`.
**Prisma correspondence**: `BibliographicRecord` → `BibliographicAuthor`/`Author`, `Edition`, `Holding` → `Item`, scoped by `libraryId`; no mock records used by `/catalog`. Runtime verified by typecheck/build; browser verification was blocked because the local preview was not listening on port 3000.
- **Route**: `/admin/catalog/records`
- **Components**:
  - `RecordSearchBar`: Title, author, ISBN, subject filters
  - `RecordList`: Table (title, author, ISBN, classification, status, item count)
  - `RecordFilters`: Advanced filters (year, language, status, collection)
  - Pagination, sorting (title, created, updated)
- **Actions** (server):
  - `searchBibliographicRecords` (full-text on title/description)
  - `listRecords` (with pagination)
  - `getRecordDetail`
- **Validation**: Library scope enforced
- **RBAC**: READ for CATALOGER+, no write yet
- **Search**: Should query BibliographicRecord fields + Author names
- **Status**: PARTIAL — list/search surface exists; detail, pagination, filters, mutations and integration tests remain.

#### 4.2 Bibliographic Records - Detail & View
**Scope**: Anyone with READ permission
- **Route**: `/admin/catalog/records/[id]`
- **Components**:
  - `RecordDetail`: Full record display
    - Title, subtitle, description
    - Authors (links to author detail)
    - Publisher (link to publisher detail)
    - Edition(s) with ISBN
    - Subjects (links to subject detail)
    - Classification
    - Collection
    - Item count by status (Available, On Loan, etc.)
    - MARC record (collapsed section)
  - `RecordActions`: Edit (if authorized), delete (if no items), create item
  - `ItemsByStatus`: Breakdown of items in each status
- **Status**: NOT STARTED

#### 4.3 Bibliographic Records - Create & Edit
**Scope**: CATALOGER, LIBRARIAN
- **Route**: `/admin/catalog/records/create`, `/admin/catalog/records/[id]/edit`
- **Components**:
  - `RecordForm`: Multi-step form
    - Step 1: Title, subtitle, description, year, language
    - Step 2: Authors (search + add)
    - Step 3: Publisher (search + create if not exists)
    - Step 4: Subjects (search + add multiple)
    - Step 5: Classification (select scheme, code)
    - Step 6: Collection, cover image upload
    - Step 7: Review + submit
  - Form validation, error states
  - `AuthorSearch`: Auto-complete for authors (create new inline)
  - `PublisherSearch`: Auto-complete for publishers
  - `SubjectSelect`: Multi-select with search
  - `ClassificationSelect`: Dropdown by scheme
- **Actions** (server):
  - `createBibliographicRecord`
  - `updateBibliographicRecord`
  - `deleteBibliographicRecord` (cascade to editions, but warn if items exist)
  - `validateISBN`
- **Validation**:
  - Title required
  - At least one author
  - Year is integer if provided
  - ISBN format if provided
  - Subject must exist per library
  - Classification must exist per library
- **RBAC**: CATALOGER+ can create, LIBRARIAN+ can edit
- **Audit**: Creation, all field changes
- **Status**: NOT STARTED

#### 4.4 Authors Management
**Scope**: CATALOGER, LIBRARIAN
- **Route**: `/admin/catalog/authors`
- **Components**:
  - `AuthorList`: Table (name, kind, record count)
  - `AuthorForm`: Create/edit (name, kind)
  - `AuthorDetail`: View associated records
  - Search by name
- **Actions** (server):
  - `listAuthors`
  - `searchAuthors` (auto-complete)
  - `createAuthor`
  - `updateAuthor`
  - `deleteAuthor` (only if no records)
- **Validation**: Name required, name uniqueness
- **RBAC**: CATALOGER+ can manage
- **Audit**: CRUD
- **Status**: NOT STARTED

#### 4.5 Publishers Management
**Scope**: CATALOGER, LIBRARIAN
- **Route**: `/admin/catalog/publishers`
- **Components**:
  - `PublisherList`: Table (name, record count)
  - `PublisherForm`: Create/edit (name)
  - `PublisherDetail`: View associated records
  - Search by name
- **Actions** (server):
  - `listPublishers`
  - `searchPublishers`
  - `createPublisher`
  - `updatePublisher`
  - `deletePublisher` (only if no records)
- **Validation**: Name required, uniqueness
- **RBAC**: CATALOGER+
- **Audit**: CRUD
- **Status**: NOT STARTED

#### 4.6 Subjects Management (Library-scoped)
**Scope**: CATALOGER, LIBRARIAN
- **Route**: `/admin/catalog/subjects`
- **Components**:
  - `SubjectList`: Table (term, authority URI, record count)
  - `SubjectForm`: Create/edit (term, authority URI)
  - `SubjectDetail`: View associated records
  - Search by term
- **Actions** (server):
  - `listSubjects` (per library)
  - `createSubject`
  - `updateSubject`
  - `deleteSubject` (only if no records)
- **Validation**: Term required, uniqueness per library
- **RBAC**: CATALOGER+
- **Audit**: CRUD
- **Status**: PARTIAL (exists in seed, needs UI)

#### 4.7 Classifications Management (Library-scoped)
**Scope**: CATALOGER, LIBRARIAN
- **Route**: `/admin/catalog/classifications`
- **Components**:
  - `ClassificationList`: Table (scheme, code, label, record count)
  - `ClassificationForm`: Create/edit (scheme, code, label)
  - `ClassificationDetail`: View associated records
  - Filter by scheme
- **Actions** (server):
  - `listClassifications` (per library)
  - `createClassification`
  - `updateClassification`
  - `deleteClassification` (only if no records)
- **Validation**: Code uniqueness per scheme/library, scheme + code required
- **RBAC**: CATALOGER+
- **Audit**: CRUD
- **Status**: PARTIAL (exists in seed, needs UI)

#### 4.8 Collections Management
**Scope**: LIBRARIAN
- **Route**: `/admin/catalog/collections`
- **Components**:
  - `CollectionList`: Table (name, description, item count, record count)
  - `CollectionForm`: Create/edit (name, description)
  - `CollectionDetail`: View associated records and items
  - Search by name
- **Actions** (server):
  - `listCollections` (per library)
  - `createCollection`
  - `updateCollection`
  - `deleteCollection` (only if no records)
  - `getCollectionStats`
- **Validation**: Name required, name uniqueness per library
- **RBAC**: LIBRARIAN+
- **Audit**: CRUD
- **Status**: NOT STARTED

---

## Cycle 5: Catalog Holdings & Items

### Goal
Implement holding and item management, covering the physical inventory layer.

### Tasks

#### 5.1 Holdings Management
**Scope**: CATALOGER, LIBRARIAN
- **Route**: `/admin/catalog/holdings`
- **Components**:
  - `HoldingsList`: Table per record (branch, shelfmark, item count)
  - `HoldingForm`: Create/edit (branch selection, shelfmark)
  - Accessible from record detail with quick-add
- **Actions** (server):
  - `createHolding`
  - `updateHolding`
  - `deleteHolding` (only if no items)
  - `listHoldingsByRecord`
- **Validation**: One holding per record/branch, branch required
- **RBAC**: CATALOGER+
- **Audit**: CRUD
- **Status**: NOT STARTED

#### 5.2 Items Management - List & Search
**Scope**: CATALOGER, LIBRARIAN, CIRCULATION_STAFF
- **Route**: `/admin/inventory/items`
- **Components**:
  - `ItemSearchBar`: Barcode, title (via record), status filters
  - `ItemList`: Table (barcode, title, branch, status, shelf location, condition, price)
  - `ItemFilters`: Status, branch, collection, material type, condition
  - Pagination, sorting
- **Actions** (server):
  - `listItems` (per library + branch if scoped)
  - `searchItems` (by barcode, record title)
  - `getItemDetail`
- **Validation**: Library/branch scope enforced
- **RBAC**: READ for CATALOGER+
- **Status**: NOT STARTED

#### 5.3 Items Management - Create & Edit
**Scope**: CATALOGER, LIBRARIAN
- **Route**: `/admin/inventory/items/create`, `/admin/inventory/items/[id]/edit`
- **Components**:
  - `ItemForm`:
    - Barcode (auto-generated option or manual)
    - Record selection (search)
    - Edition selection (once record chosen)
    - Branch selection
    - Shelf location (branch-scoped)
    - Material type (library-scoped)
    - Collection
    - Condition (dropdown)
    - Price
    - Status (default AVAILABLE)
  - Form validation
  - Bulk item creation (multiple barcodes at once)
- **Actions** (server):
  - `createItem` (with idempotency on barcode)
  - `updateItem`
  - `deleteItem` (only if no loans)
  - `generateBarcode`
  - `bulkCreateItems`
- **Validation**:
  - Barcode uniqueness
  - Record exists
  - Branch accessible (scoped)
  - Shelf location belongs to branch
  - Material type belongs to library
  - Collection belongs to library
- **RBAC**: CATALOGER+
- **Audit**: Creation, all changes
- **Status**: NOT STARTED

#### 5.4 Items - Detail & Status History
**Scope**: CATALOGER+, CIRCULATION_STAFF
- **Route**: `/admin/inventory/items/[id]`
- **Components**:
  - `ItemDetail`: Full item info (barcode, record, status, location, etc.)
  - `ItemStatusHistory`: Timeline of all status changes (AVAILABLE → ON_LOAN → AVAILABLE, etc.)
  - `ItemLoanHistory`: Associated loans
  - `ItemHolds`: Active holds for this item
  - `ItemActions`: Manual status change (for lost/damaged items)
- **Status**: NOT STARTED

#### 5.5 Material Types Management (Library-scoped)
**Scope**: LIBRARIAN
- **Route**: `/admin/inventory/material-types`
- **Components**:
  - `MaterialTypeList`: Table (code, name, loanable flag, item count)
  - `MaterialTypeForm`: Create/edit (code, name, loanable)
- **Actions** (server):
  - `listMaterialTypes` (per library)
  - `createMaterialType`
  - `updateMaterialType`
  - `deleteMaterialType` (only if no items)
- **Validation**: Code uniqueness per library, code + name required
- **RBAC**: LIBRARIAN+
- **Audit**: CRUD
- **Status**: PARTIAL (exists in seed, needs UI)

#### 5.6 Shelf Locations Management (Library + Branch scoped)
**Scope**: LIBRARIAN, BRANCH_MANAGER
- **Route**: `/admin/inventory/shelf-locations`
- **Components**:
  - `ShelfLocationList`: Table per branch (code, label, item count)
  - `ShelfLocationForm`: Create/edit (code, label, branch)
  - Filter by branch
- **Actions** (server):
  - `listShelfLocations` (per library + branch)
  - `createShelfLocation`
  - `updateShelfLocation`
  - `deleteShelfLocation` (only if no items)
- **Validation**: Code uniqueness per branch, code + label required, branch scope enforced
- **RBAC**: LIBRARIAN (all branches), BRANCH_MANAGER (own branch)
- **Audit**: CRUD
- **Status**: PARTIAL (exists in seed, needs UI)

---

## Cycle 6: Members & Member Management

### Goal
Implement member CRUD with categories, notes, and member account overview.

### Tasks

#### 6.1 Member Categories Management (Library-scoped)
**Scope**: LIBRARIAN
- **Route**: `/admin/members/categories`
- **Components**:
  - `CategoryList`: Table (name, status, max loans, loan days, max renewals, member count)
  - `CategoryForm`: Create/edit (name, max loans, loan days, max renewals)
- **Actions** (server):
  - `listMemberCategories` (per library)
  - `createMemberCategory`
  - `updateMemberCategory`
  - `deleteMemberCategory` (only if no members)
- **Validation**: Name uniqueness per library, name required, positive integers for limits
- **RBAC**: LIBRARIAN+
- **Audit**: CRUD
- **Status**: PARTIAL (exists in seed, needs UI)

#### 6.2 Members - List & Search
**Scope**: LIBRARIAN, CIRCULATION_STAFF, MEMBER_ADMIN
- **Route**: `/admin/members`
- **Components**:
  - `MemberSearchBar`: Name, member number, email, barcode
  - `MemberList`: Table (member number, name, category, status, branch, created date)
  - `MemberFilters`: Status (Active/Suspended/Expired), category, branch
  - Pagination, sorting
- **Actions** (server):
  - `listMembers` (per library/branch scope)
  - `searchMembers` (by name, number, email, barcode)
- **Validation**: Library/branch scope enforced
- **RBAC**: LIBRARIAN+ can read
- **Status**: NOT STARTED

#### 6.3 Members - Create & Edit
**Scope**: MEMBER_ADMIN, LIBRARIAN
- **Route**: `/admin/members/create`, `/admin/members/[id]/edit`
- **Components**:
  - `MemberForm`:
    - Member number (auto-generated option or manual)
    - Name (required)
    - Email
    - Phone
    - Category (select from library categories)
    - Branch (for default branch, can change later)
    - Status (Active/Suspended/Expired)
    - Barcode (optional, auto-generated)
  - Form validation
- **Actions** (server):
  - `createMember` (with idempotency on member number)
  - `updateMember`
  - `getMemberById`
  - `generateMemberNumber`
- **Validation**:
  - Member number uniqueness per library
  - Name required
  - Email format if provided
  - Category belongs to library
  - Branch belongs to library
- **RBAC**: MEMBER_ADMIN, LIBRARIAN+
- **Audit**: Creation, all field changes
- **Status**: NOT STARTED

#### 6.4 Members - Detail & Overview
**Scope**: MEMBER_ADMIN+, CIRCULATION_STAFF
- **Route**: `/admin/members/[id]`
- **Components**:
  - `MemberDetail`: Full info (number, name, category, status, contact, notes)
  - `MemberLoans`: Active loans, overdue loans
  - `MemberHolds`: Active holds
  - `MemberFines`: Outstanding fines, paid fines
  - `MemberAccountHistory`: Account transactions
  - `MemberNotes`: Internal notes (staff only)
  - `MemberActions`: Edit, suspend, delete, create loan
- **Actions** (server):
  - `getMemberDetail`
  - `getMemberLoans`
  - `getMemberHolds`
  - `getMemberFines`
  - `getMemberAccountHistory`
  - `getMemberNotes`
- **Status**: NOT STARTED

#### 6.5 Members - Bulk Operations
**Scope**: LIBRARIAN
- **Route**: `/admin/members/bulk`
- **Components**:
  - `BulkMemberImport`: CSV upload (member number, name, email, phone, category, branch)
  - `BulkMemberActions`: Suspend, activate, change category for multiple
  - Preview before apply
- **Actions** (server):
  - `bulkCreateMembers`
  - `bulkUpdateMembers`
  - `bulkActivateMembers`
  - `bulkSuspendMembers`
- **Validation**: Same as individual operations, plus row-level error reporting
- **RBAC**: LIBRARIAN+
- **Audit**: Bulk operation logged with count
- **Status**: NOT STARTED

---

## Cycle 7: Circulation Desk

### Goal
Implement checkout, return, renew, and hold workflows for circulation staff.

### Tasks

#### 7.1 Circulation Desk - Main Interface
**Scope**: CIRCULATION_STAFF, LIBRARIAN
- **Route**: `/circulation/desk`
- **Components**:
  - `CirculationDesk`: Main container
    - Left panel: Member search + quick info
    - Middle panel: Current operation (checkout/return/renew)
    - Right panel: Activity log
  - `MemberQuickSearch`: Search by member number, barcode, name (async)
  - `MemberQuickInfo`: Name, current loans, overdue count, fines total, holds
- **Behavior**:
  - Search member
  - Display current loans (click to renew/return)
  - Display holds
  - Display fines
  - Switch to item scan for checkout
- **Status**: NOT STARTED

#### 7.2 Checkout Operation
**Scope**: CIRCULATION_STAFF+
- **Route**: `/circulation/desk` (operation mode)
- **Components**:
  - `CheckoutForm`:
    - Member field (auto-filled if searched)
    - Item barcode input (focus here for scanning)
    - Item preview (title, status, last status)
    - Loan duration (from policy)
    - Add another item button
    - Checkout all items button
  - `CheckoutConfirmation`: Summary of items checked out, due dates
  - `CheckoutError`: Display if checkout fails (item not available, holds, etc.)
- **Actions** (server):
  - `checkoutItem` (server action, transactional)
    - Validate member exists + active
    - Validate item exists + available
    - Apply circulation policy
    - Check holds
    - Create loan record
    - Update item status
    - Create ItemStatusHistory
    - Create AuditLog
    - Return: success or error with reason
- **Validation**:
  - Member exists and active
  - Item exists and available (not on loan, not on hold, not damaged)
  - No duplicate active loan for same item
  - Member has not exceeded loan limit
  - All validation happens server-side
- **RBAC**: CIRCULATION_STAFF+
- **Idempotency**: Same checkout attempt twice should be safe (idempotency key on barcode + member + timestamp)
- **Audit**: Every checkout logged with member, item, branch, staff
- **Error Handling**: Show clear reason why checkout failed
- **Status**: PARTIAL — service path exists in `lib/services/circulation.ts`; bilingual desk UI and integration tests remain.

#### 7.3 Return Operation
**Scope**: CIRCULATION_STAFF+
- **Route**: `/circulation/desk` (operation mode)
- **Components**:
  - `ReturnForm`:
    - Item barcode input (focus for scanning)
    - Item preview + associated loan info
    - Overdue indicator
    - Fine indicator
    - Return button
  - `ReturnConfirmation`: Loan summary, any fines generated
  - `ReturnError`: If return fails
- **Actions** (server):
  - `returnItem` (server action, transactional)
    - Validate item exists
    - Validate active loan exists
    - Calculate overdue days (if past due date)
    - Generate fine if overdue (per policy + days)
    - Update loan status to RETURNED
    - Update item status to AVAILABLE
    - Create ItemStatusHistory (reason: RETURN)
    - Create Fine record if needed
    - Create AuditLog
- **Validation**:
  - Item exists
  - Active loan exists for item
  - Item is currently ON_LOAN (or in hold/processing state)
- **RBAC**: CIRCULATION_STAFF+
- **Audit**: Every return logged
- **Fine Calculation**: Based on CirculationPolicy (daily fine amount, grace period)
- **Status**: PARTIAL — transactional return, overdue fine creation, account CHARGE ledger entry, audit and idempotency are implemented; UI and integration tests remain.

#### 7.4 Renew Operation
**Scope**: CIRCULATION_STAFF+, MEMBER (self-service in future)
- **Route**: `/circulation/desk` (operation mode)
- **Components**:
  - `RenewForm`:
    - Item selection (from member's current loans)
    - New due date display
    - Renewal count display
  - `RenewConfirmation`: Success with new due date
  - `RenewError`: If renewal denied (max renewals, holds, etc.)
- **Actions** (server):
  - `renewLoan` (server action, transactional)
    - Validate loan exists + active
    - Check renewal limit (from category + policy)
    - Check if item has holds (if yes, cannot renew in most policies)
    - Update loan due date
    - Increment renewal count
    - Create LoanRenewal record
    - Create AuditLog
- **Validation**:
  - Loan exists and active
  - Renewal limit not exceeded
  - No holds on item (or policy allows)
  - Member is in good standing (no excessive fines)
- **RBAC**: CIRCULATION_STAFF+
- **Audit**: Every renewal logged
- **Status**: PARTIAL — renewal event, policy limit, hold blocking, audit and idempotency are implemented; UI and integration tests remain.

#### 7.5 Hold Management - Circulation Desk
**Scope**: CIRCULATION_STAFF+
- **Route**: `/circulation/desk` (view holds)
- **Components**:
  - `HoldsList`: Queued holds, ready holds, expired holds
  - `HoldAction`: Mark ready, cancel, expire
- **Actions** (server):
  - `listHolds` (for branch/library)
  - `markHoldReady`
  - `cancelHold`
  - `expireHold`
  - `fulfillHold` (when member picks up)
- **Status**: PARTIAL — member-to-record/item hold creation is transactional, scoped, duplicate-protected, audited and idempotent; desk management actions remain.

---

## Cycle 8: Circulation Policy Management

### Goal
Implement circulation policies and fine management.

### Tasks

#### 8.1 Circulation Policies (Library-scoped)
**Scope**: LIBRARIAN
- **Route**: `/admin/policies/circulation`
- **Components**:
  - `PolicyList`: Table (name, status, loan days, max renewals, daily fine, grace days)
  - `PolicyForm`: Create/edit
    - Name
    - Loan days (default 21)
    - Max renewals (default 3)
    - Daily fine amount
    - Grace period days
    - Status (active/inactive)
  - `PolicyDetail`: View associated member categories
- **Actions** (server):
  - `listCirculationPolicies` (per library)
  - `createPolicy`
  - `updatePolicy`
  - `deletePolicy` (only if no categories)
  - `getDefaultPolicy`
- **Validation**: Name required, name uniqueness per library, positive integers
- **RBAC**: LIBRARIAN+
- **Audit**: CRUD
- **Status**: PARTIAL (exists in seed, needs UI)

#### 8.2 Fines Management - View & Search
**Scope**: MEMBER_ADMIN, LIBRARIAN, CIRCULATION_STAFF
- **Route**: `/admin/fines`
- **Components**:
  - `FineSearchBar`: Member name, member number, date range
  - `FineList`: Table (member, amount, reason, created, paid date, status)
  - `FineFilters`: Status (unpaid/paid), date range, amount range
  - Pagination
- **Actions** (server):
  - `listFines` (per library/branch)
  - `searchFines`
  - `getFinesByMember`
- **Status**: NOT STARTED

#### 8.3 Fines Management - Record & Payment
**Scope**: LIBRARIAN, CIRCULATION_STAFF
- **Route**: `/admin/fines/[id]` (detail + record/pay)
- **Components**:
  - `FineDetail`: Member, reason, amount, created, related loan
  - `FinePayment`: Record payment form (amount, date, notes)
  - `FineWaiver`: Waive fine (requires LIBRARIAN role)
  - Payment history
- **Actions** (server):
  - `recordFinePayment`
  - `waiveFine`
  - `getFineDetail`
- **Validation**: Payment amount <= fine amount, date valid
- **RBAC**: CIRCULATION_STAFF (record), LIBRARIAN (waive)
- **Audit**: All transactions logged
- **Status**: NOT STARTED

---

## Cycle 9: Public OPAC (Online Public Access Catalog)

### Goal
Implement public search and discovery interface.

### Tasks

#### 9.1 OPAC - Search & Browse
**Scope**: Public (no auth required)
- **Route**: `/opac/search`
- **Components**:
  - `OPACSearch`: Search bar (title, author, ISBN, subject)
  - `OPACResults`: List (title, author, description snippet, availability)
  - `OPACFilters`: Subject, language, year range, availability
  - Pagination
- **Actions** (server):
  - `publicSearchCatalog` (search BibliographicRecords)
  - `publicListSubjects`
  - `publicGetAvailability` (item count by status)
- **Validation**: Public library scope (if multi-library, show all or scope by user location)
- **RBAC**: Public (no auth needed)
- **Features**:
  - Autocomplete search suggestions
  - Faceted search (subject, language, year)
  - Sort options (relevance, title, year)
- **Status**: NOT STARTED

#### 9.2 OPAC - Record Detail
**Scope**: Public
- **Route**: `/opac/books/[id]`
- **Components**:
  - `OPACRecordDetail`:
    - Title, subtitle, cover image
    - Authors, publisher, year
    - Description
    - Subjects
    - Classification
    - ISBN(s)
    - Availability: Available/On Loan/Hold counts by branch
    - Holdings info (branch, shelf location)
    - "Place Hold" button (for members)
    - "Request to Library" form (for non-members)
- **Status**: NOT STARTED

#### 9.3 OPAC - Member Features
**Scope**: Authenticated members
- **Route**: `/member/account`
- **Components**:
  - `MemberDashboard`:
    - Current loans (due dates, renew buttons)
    - Holds (status, pickup branch)
    - Fines (amount, payment link for future)
    - Account settings (password, contact info)
- **Status**: NOT STARTED

---

## Cycle 10: Admin Settings & Audit

### Goal
Complete admin configuration and audit trail visibility.

### Tasks

#### 10.1 Admin Settings - Library
**Scope**: LIBRARIAN
- **Route**: `/admin/settings/library`
- **Components**:
  - `LibrarySettings`:
    - Library name, slug (slug locked)
    - Opening hours
    - Contact email/phone
    - Website URL
    - Default collection
    - Language preference
    - Save button
- **Status**: NOT STARTED

#### 10.2 Audit Log Viewer
**Scope**: LIBRARIAN (own library audit), PLATFORM_ADMIN (all)
- **Route**: `/admin/audit`
- **Components**:
  - `AuditLogSearch`:
    - Entity filter (User, Member, Item, Loan, Fine, etc.)
    - Action filter (CREATE, UPDATE, DELETE)
    - User filter
    - Date range
    - Result filter (SUCCESS, FAILURE)
  - `AuditLogList`: Table (timestamp, user, action, entity, before/after JSON, result)
  - `AuditLogDetail`: Expand row to see full before/after JSON
- **Actions** (server):
  - `listAuditLogs` (with library scope)
  - `getAuditLogDetail`
- **Status**: NOT STARTED

---

## Cycle 11: Integration Tests

### Goal
Complete integration test suite for all workflows.

### Tasks

#### 11.1 Auth Tests
- Login, logout, session expiry
- RBAC enforcement
- Cross-tenant isolation
- User status (active/inactive)

#### 11.2 Circulation Tests
- Checkout idempotency
- Return + fine calculation
- Renew with hold blocking
- Concurrent item access
- Policy enforcement

#### 11.3 Multi-tenancy Tests
- User A cannot see Tenant B data
- Library A users cannot access Library B catalog
- Branch-scoped operations

#### 11.4 Catalog Tests
- Record CRUD with author/subject/classification
- Item creation with validation
- Duplicate barcode prevention
- Cascade delete (record → editions → items)

#### 11.5 Audit Tests
- All mutations create audit log
- Before/after JSON captured
- User context preserved

---

## Implementation Priority Matrix

### High Priority (P0 gates — do not bypass)
1. **P0.1 Auth/session adapter**: integrate and verify Better Auth session lifecycle.
2. **P0.2 Scope integrity**: add reviewed composite constraints/migrations for tenant/library/branch compatibility.
3. **P0.3 Integration test harness**: PostgreSQL isolation, concurrency, idempotency and RBAC tests.
4. **P0.4 Circulation hardening**: checkout, return, renew, hold with policy, ledger, audit and real authorization.
5. **P0.5 Repository boundary**: remove direct Prisma access from UI/routes and document context contracts.

### Medium Priority (P1 operational surfaces)
6. **P1.1 Catalog + inventory**: detail, CRUD, editions, holdings, items, status history.
7. **P1.2 Members**: scoped CRUD, notes, account view and bilingual workflows.
8. **P1.3 Circulation Desk UI**: connected checkout/return/renew/hold actions and error states.
9. **P1.4 Fines and ledger**: payment, waiver, adjustment with immutable audit trail.
10. **P1.5 Organization/admin**: tenant, network, library, branch, policies and settings.

### Lower Priority (P2 public and platform expansion)
11. **P2.1 OPAC**: real search, record detail and availability by branch.
12. **P2.2 Audit/reporting**: filtered audit viewer, operational reports and exports.
13. **P2.3 Integrations**: MARC21 import/export, notifications, digital resources, serials and migration tooling.

---

## Status Summary

| Cycle | Component | Status | Notes |
|-------|-----------|--------|-------|
| P0.1 | Authentication/session | PARTIAL | Better Auth route, email/password client, server session lookup, protected route and tenant authorization context are wired; browser cookie lifecycle and production verification remain |
| P0.2 | Tenant/RBAC/scopes | PARTIAL | Server-side guards and authorization tests exist; DB composite integrity and full role matrix remain |
| P0.3 | Prisma/PostgreSQL | PARTIAL | Schema, migrations and indexes verified; cross-entity FK integrity needs review |
| P0.4 | Catalog | PARTIAL | Scoped list/search exists; detail, CRUD, pagination and integration tests remain |
| P0.5 | Circulation | PARTIAL | Transactional service paths exist; policy selection, concurrency tests and connected UI remain |
| P0.6 | Audit/idempotency | PARTIAL | Core circulation events and idempotency exist; complete mutation taxonomy and replay tests remain |
| P1.1 | Items/Holdings | MISSING | Models and seed exist; operational repository/UI flows are not complete |
| P1.2 | Members | PARTIAL | Scoped lookup exists; CRUD, notes, account and UI remain |
| P1.3 | Fines/ledger | PARTIAL | Overdue charge exists; payment, waiver, adjustment workflows remain |
| P2.1 | OPAC | MISSING | Public real-data search and availability remain |
| P2.2 | Audit/reporting | MISSING | Operational viewer and reports remain |
| P2.3 | Integration tests | PARTIAL | 10 contract tests plus 3 PostgreSQL integrity tests pass, including reproducible Tenant A/B fixture isolation; mutation concurrency and rollback suite remains |

---

## Key Constraints & Notes

### Multi-tenancy
- All queries must filter by `tenantId`
- Library and Branch scopes are cascading (cannot access across library boundaries)
- User roles are scoped to library/branch

### Concurrency & Idempotency
- Checkout/return must be transactional
- Idempotency keys prevent duplicate operations
- Database constraints (unique barcode, member number) provide safety net

### Audit Trail
- Every CREATE/UPDATE/DELETE must create AuditLog
- Before/after JSON captures full state change
- User context from session

### RBAC Enforcement
- Server-side authorization on every action
- No UI-level permission checking
- PermissionDenied errors return 403

### Data Validation
- Input validation in forms + server actions
- Uniqueness constraints at DB level
- Date/number/email format validation

---

## Next Steps — Sequenced Delivery

1. **Now / P0 blocker removal**
   - Verify Better Auth route, session creation, expiry, revocation and `BETTER_AUTH_SECRET` in the running environment.
   - Add PostgreSQL integration test harness with isolated fixtures for Tenant A/B and branch-scoped actors.
   - Review and migrate composite scope constraints for Holding/Branch, Item/Holding, Member/Branch and Loan context.

2. **After P0 gates pass**
   - Connect Circulation Desk UI to server actions for checkout, return, renew and hold.
   - Add policy resolution from the selected library and complete FinePayment/WAIVER/ADJUSTMENT ledger services.
   - Add negative-path UX in English and Spanish: permission denied, out of scope, unavailable, conflict, retry and validation states.

3. **P1 operational completion**
   - Complete catalog detail/CRUD, holdings/items and member management through repositories and services.
   - Add organization context selector with URL state and server-validated scope; do not use client storage as authorization.
   - Add audit viewer and operational reporting only from real PostgreSQL aggregates.

4. **P2 public surface**
   - Implement real OPAC search/detail/availability routes with public-safe queries and no administrative data leakage.
   - Add MARC21, notifications, digital, serials and migration workflows only after P0/P1 acceptance gates are green.

### Release gate
No production readiness claim until all P0 items are DONE, PostgreSQL integration tests pass, `pnpm db:check`, `pnpm typecheck`, `pnpm test`, `pnpm build` pass, and the critical flows are verified in the browser at desktop and mobile widths.
