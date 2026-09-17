# BiblioNexus - Interface Development Roadmap

**Status**: Reconciled roadmap; implementation remains partial  
**Target**: Enterprise-ready multi-tenant ILS with verified UI, services, persistence, authorization, audit and tests  
**Canonical progress**: Not calculated; no percentage is published without complete evidence  
**Last Updated**: 2026-09-17

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
- **Status**: NOT STARTED

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
- **Status**: NOT STARTED

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
- **Status**: NOT STARTED

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
- **Status**: NOT STARTED

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
- **Status**: NOT STARTED

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

### High Priority (Core functionality)
1. ✅ Cycle 1: Auth (DONE)
2. ✅ Cycle 2: RBAC (DONE)
3. **Cycle 3**: Organization (Tenant/Library/Branch)
4. **Cycle 4**: Catalog basics (Records, Authors, Publishers)
5. **Cycle 7**: Circulation core (Checkout/Return/Renew)

### Medium Priority (Essential admin)
6. **Cycle 5**: Items & Holdings
7. **Cycle 6**: Members
8. **Cycle 8**: Policies & Fines

### Lower Priority (Public + enhancements)
9. **Cycle 9**: OPAC
10. **Cycle 10**: Settings & Audit
11. **Cycle 11**: Integration tests

---

## Status Summary

| Cycle | Component | Status | Notes |
|-------|-----------|--------|-------|
| 1 | Authentication | ✅ DONE | Better Auth configured, seed has users |
| 2 | RBAC | ✅ DONE | Roles, permissions, authorization context |
| 3 | Organization | 🟡 PARTIAL | Schema ready, seed has data, UI missing |
| 4 | Catalog | ❌ NOT STARTED | Schema ready, seed has data |
| 5 | Items/Holdings | ❌ NOT STARTED | Schema ready, seed has data |
| 6 | Members | ❌ NOT STARTED | Schema ready, seed has data |
| 7 | Circulation | ❌ NOT STARTED | Schema ready, operations defined |
| 8 | Policies | 🟡 PARTIAL | Schema ready, seed has data |
| 9 | OPAC | ❌ NOT STARTED | Schema ready |
| 10 | Settings/Audit | ❌ NOT STARTED | Schema ready |
| 11 | Integration Tests | ❌ NOT STARTED | Framework exists, tests sparse |

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

## Next Steps

1. **Immediately** (after this roadmap):
   - Fix sidebar toggle in AppShell
   - Begin Cycle 3 (Organization UI)

2. **This sprint**:
   - Complete Cycle 3 (Tenant/Library/Branch UI)
   - Begin Cycle 4 (Catalog UI)

3. **Next sprint**:
   - Complete Cycle 4 & 5 (Catalog + Items)
   - Begin Cycle 6 (Members)

4. **Following**:
   - Complete Cycle 6 & 7 (Members + Circulation)
   - Begin Cycle 9 (OPAC)
