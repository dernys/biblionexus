# BiblioNexus — Enterprise ILS Architecture

**Version:** 1.0  
**Status:** Target architecture; implementation is partial  
**Last Updated:** 2026-09-17  
**Audience:** Architects, Tech Leads, Senior Developers

> This document describes the target architecture and contains illustrative contracts. It does not claim that every listed model, service, permission, or integration exists in the current repository. The current verified state and gaps are maintained in `DEVELOPMENT.md`; implementation status is tracked in `docs/development/ROADMAP.md`.

> Important schema note: the current `UserRole` model is scoped by `libraryId`/`branchId` and does not currently contain the illustrative `tenantId` field shown below. Tenant compatibility must be enforced by scoped services until a reviewed Prisma migration introduces stronger composite integrity.

---

## Executive Summary

BiblioNexus is a modern, cloud-native, multi-tenant Integrated Library System (ILS) designed to exceed Espabiblio functionality while maintaining interoperability with legacy data. The architecture prioritizes:

- **Tenant isolation and security-by-default**
- **Real operational workflows** (not CRUD demos)
- **Domain-driven design** aligned with international library standards
- **AI-native capabilities** for discovery, cataloging, and circulation intelligence
- **Enterprise-grade observability and auditability**
- **Extensibility** for digital, serials, acquisitions, and integrations

---

## 1. Architectural Principles

### 1.1 Tenant-First Multi-Tenancy

```
Tenant (organizational boundary)
├── LibraryNetwork (optional logical grouping)
│   └── Library (operation unit with independent catalog/members/policies)
│       └── Branch (physical location, inventory scope)
```

**Every query, mutation, and authorization decision MUST include tenant scope.** There is no default scope.

```typescript
// ✓ Correct: explicit tenant + library scoping
const items = await db.item.findMany({
  where: {
    holding: {
      record: {
        libraryId,
        library: { tenantId }
      }
    }
  }
});

// ✗ Wrong: arbitrary filtering without scope
const items = await db.item.findMany({ where: { status: 'AVAILABLE' } });
```

### 1.2 Convention: UI → Server Action → Service → Prisma

Every user-facing mutation follows this pipeline:

```
React Component (UI)
         ↓
    Server Action
    (next/server)
         ↓
    AuthorizationContext
    (session + scope)
         ↓
    Domain Service
    (business logic)
         ↓
    Repository Layer
    (queries + transactions)
         ↓
    Prisma Client
    (PostgreSQL)
         ↓
    AuditLog
    (immutable record)
```

- **UI** renders according to permissions but never trusts client-side authorization.
- **Server Actions** resolve the session and verify authorization server-side.
- **Services** contain business logic (policies, transactions, idempotency).
- **Repositories** abstract Prisma and apply scope guards.
- **AuditLog** records mutations for compliance.

**No component ever imports `PrismaClient` directly.**

### 1.3 Transaction Integrity

Sensitive operations (checkout, return, fine calculation) must be:

- **Transactional:** all-or-nothing, no partial state.
- **Idempotent:** retries produce the same result.
- **Audited:** every action is logged with actor, resource, before/after state.
- **Scoped:** cannot cross tenant, library, or branch boundaries.

Example: checkout must atomic create Loan, update Item.status, create ItemStatusHistory, record AuditLog, and check idempotency key in one transaction.

---

## 2. Domain Model

### 2.1 Core Hierarchies

#### Organization

```
Tenant
  ├── LibraryNetwork
  │   └── Library
  │       └── Branch
  └── User (tenant-scoped, role-assigned via UserRole)
```

#### Catalog

```
BibliographicRecord (authority record, tenant + library scoped)
  ├── Author (person/corporate, possibly shared across libraries)
  ├── Publisher (shared reference)
  ├── Subject (normalized, library-scoped vocabulary)
  ├── Classification (Dewey/UDC/LC/custom, library-scoped)
  └── Edition (manifestation, ISBN scoped)
      └── Item (exemplar, branch-scoped, unique barcode)
          └── Holding (branch location, item count, shelfmark)
```

#### Circulation

```
Member (patron, library + branch scoped)
  ├── MemberCategory (policy reference)
  ├── Loan (Member + Item + CirculationPolicy)
  │   ├── LoanRenewal (policy-bounded)
  │   └── ItemStatusHistory (audit trail)
  ├── Hold (Member + Record/Item, queue-managed)
  ├── Fine (automatic or manual charge)
  │   └── FinePayment (payment record)
  └── MemberAccountTransaction (ledger entry)
```

#### Configuration

```
Library
  ├── MemberCategory (max loans, duration, renewals)
  ├── MaterialType (loanable flag, circulation traits)
  ├── Collection (logical grouping)
  ├── Classification (Dewey/UDC/LC/custom schemes)
  ├── Subject (controlled vocabulary)
  ├── CirculationPolicy (loan duration, fines, holds rules)
  ├── ShelfLocation (branch + location code)
  └── LibrarySetting (config key-value)
```

### 2.2 Separation of Concerns

| Concept | Ownership | Scope | Mutable | Notes |
|---------|-----------|-------|--------|-------|
| BibliographicRecord | Cataloger | Tenant + Library | Yes | Authority record; represents a work/expression |
| Edition | Cataloger | Tenant + Library | Yes | Manifestation; ISBN, pages, year |
| Item | Inventory staff | Tenant + Library + Branch | Yes | Physical exemplar; barcode, status, condition |
| Holding | Cataloger | Tenant + Library + Branch | Yes | Branch holding reference and shelfmark |
| Loan | Circulation desk | Tenant + Library + Branch | Yes | Checkout/return/renewal record |
| Member | Member admin | Tenant + Library | Yes | Patron record; name, category, account |
| Fine | Automatic/Manual | Tenant + Library | Yes | Charge record; may be waived or paid |

**Critical:** A BibliographicRecord is NOT an Item. Confusing them is a root cause of ILS failures.

### 2.3 Multi-Tenancy Enforcement

Every model enforces tenant boundaries:

```prisma
model Item {
  id        String @id @default(cuid())
  holding   Holding @relation(fields: [holdingId], references: [id])
  // holding.record.library.tenantId == sessionTenant (enforced in service)
  
  @@index([holdingId])
}

model Holding {
  recordId  String
  record    BibliographicRecord @relation(fields: [recordId], references: [id])
  // record.library.tenantId == sessionTenant
}

model BibliographicRecord {
  libraryId String
  library   Library @relation(fields: [libraryId], references: [id])
  
  @@index([libraryId])
}

model Library {
  tenantId String
  tenant   Tenant @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
}
```

**Queries always apply: `WHERE library.tenantId = $sessionTenant`**

---

## 3. Identity & Authorization

### 3.1 Authentication

- **Provider:** Better Auth (email + password by default)
- **Session:** Stored in database (Session model), non-expiring until logout/revocation
- **Secret:** `BETTER_AUTH_SECRET` (set in environment)

```typescript
// app/api/auth/[...all]/route.ts
import { auth } from "@/lib/auth";

export const { GET, POST } = auth;
```

### 3.2 RBAC Model

**Roles** (global, not scoped to tenant):

- `PLATFORM_ADMIN` — system administrator, all tenants/operations
- `TENANT_ADMIN` — tenant-level configuration, users, libraries
- `LIBRARY_ADMIN` — library settings, users, cataloging policies
- `CATALOGER` — create/edit bibliographic records, items, holdings
- `LIBRARIAN` — catalog search, member management, circulation policies
- `CIRCULATION_STAFF` — checkout, return, renew, holds
- `MEMBER_ADMIN` — member CRUD, categories, bulk operations
- `PUBLIC` — OPAC search only (no admin access)

**Permissions** (action-scoped):

- `catalog:read` — list/search bibliographic records
- `catalog:write` — create/edit records, authors, publishers, subjects
- `inventory:read` — list items, holdings, material types
- `inventory:write` — create/edit items, holdings, shelf locations
- `members:read` — list members, view account
- `members:write` — create/edit members, categories, notes
- `circulation:checkout` — execute checkout
- `circulation:return` — execute return
- `circulation:renew` — execute renewal
- `circulation:hold` — create/manage holds
- `fines:read` — view fines
- `fines:write` — create/waive/payment
- `admin:users` — user CRUD
- `admin:roles` — role/permission assignment
- `admin:library` — library/branch settings
- `audit:read` — access audit logs

**UserRole** (scoped assignment):

```typescript
interface UserRole {
  userId: string;
  roleId: string;
  tenantId?: string;        // if set, restricts to this tenant
  libraryId?: string;       // if set, restricts to this library
  branchId?: string;        // if set, restricts to this branch
}
```

Example:

- User A: `LIBRARY_ADMIN` for Library X → can manage Library X only
- User B: `CIRCULATION_STAFF` for Branch Y of Library X → can checkout/return at Branch Y only
- User C: `PLATFORM_ADMIN` (no scope) → full access

### 3.3 Authorization Context

Every server action receives:

```typescript
interface AuthorizationContext {
  userId: string;
  sessionId: string;
  tenantId: string;          // required
  libraryId?: string;        // optional, from scope or session
  branchId?: string;         // optional, from scope or session
  roles: string[];           // e.g., ['CIRCULATION_STAFF']
  permissions: string[];     // e.g., ['circulation:checkout']
  isAllowedAction(action: string): boolean;
  isAllowedResource(resource: unknown): boolean;  // checks tenant/lib/branch
}
```

**Every service method receives `ctx: AuthorizationContext`** and validates:

```typescript
async function checkoutItem(
  ctx: AuthorizationContext,
  memberId: string,
  itemId: string
) {
  // 1. Verify permission
  if (!ctx.isAllowedAction('circulation:checkout')) {
    throw new PermissionDenied('User cannot checkout');
  }

  // 2. Load and verify scope of member
  const member = await db.member.findUnique({
    where: { id: memberId },
    include: { library: true }
  });
  if (!member || member.library.tenantId !== ctx.tenantId) {
    throw new ResourceNotFound();
  }

  // 3. Load and verify scope of item
  const item = await db.item.findUnique({
    where: { barcode: itemId },
    include: { holding: { include: { record: { include: { library: true } } } } }
  });
  if (!item || item.holding.record.library.tenantId !== ctx.tenantId) {
    throw new ResourceNotFound();
  }

  // 4. Check circulation policy and business rules
  // 5. Execute transaction with idempotency
  // 6. Audit
}
```

---

## 4. Data Integrity

### 4.1 Transactions

Use Prisma transactions for multi-step operations:

```typescript
await db.$transaction(async (tx) => {
  // All operations here succeed or all fail

  const loan = await tx.loan.create({
    data: { memberId, itemId, branchId, dueDate }
  });

  await tx.item.update({
    where: { id: itemId },
    data: { status: 'ON_LOAN' }
  });

  await tx.itemStatusHistory.create({
    data: {
      itemId,
      fromStatus: 'AVAILABLE',
      toStatus: 'ON_LOAN',
      reason: 'CHECKOUT',
      actorId: ctx.userId
    }
  });

  await tx.auditLog.create({
    data: {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: 'CHECKOUT',
      entity: 'Loan',
      entityId: loan.id,
      after: loan,
      result: 'SUCCESS'
    }
  });

  return loan;
});
```

### 4.2 Idempotency

Prevent double-checkout from network retries:

```typescript
// Generate deterministic key from checkout parameters
const idempotencyKey = `checkout:${memberId}:${itemId}:${timestamp}`;

const existing = await db.idempotencyKey.findUnique({
  where: { key: idempotencyKey }
});

if (existing) {
  // Return cached result
  return existing.result;
}

// Execute operation
const result = await checkout(ctx, memberId, itemId);

// Cache result
await db.idempotencyKey.create({
  data: {
    key: idempotencyKey,
    result: JSON.stringify(result),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
});

return result;
```

### 4.3 Audit Logging

Every mutation produces an AuditLog:

```typescript
await db.auditLog.create({
  data: {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    action: 'CHECKOUT',          // operation
    entity: 'Loan',               // entity type
    entityId: loan.id,            // resource id
    before: null,                 // previous state (for updates)
    after: loan,                  // new state
    result: 'SUCCESS',            // SUCCESS | FAILURE
    createdAt: new Date()
  }
});
```

Queries:

```typescript
// Audit trail for a specific member
const memberAudits = await db.auditLog.findMany({
  where: {
    tenantId: ctx.tenantId,
    entity: 'Member',
    entityId: memberId
  },
  orderBy: { createdAt: 'desc' },
  take: 100
});

// All checkouts by a user
const userCheckouts = await db.auditLog.findMany({
  where: {
    tenantId: ctx.tenantId,
    userId: actorId,
    action: 'CHECKOUT'
  }
});
```

---

## 5. Catalog Foundation

### 5.1 Bibliography vs. Inventory

| Aspect | BibliographicRecord | Item |
|--------|-------------------|------|
| Represents | Work/Expression (FRBR) | Physical exemplar |
| ISBN | Optional, may be many | Barcode (unique) |
| Count | 1 per unique title | 1..N per title |
| Status | Draft/Published/Archived | Available/OnLoan/Missing/etc. |
| Location | Logical (collection) | Physical (shelf) |

### 5.2 Authority Alignment

**Authors**

- Stored as `Author` entities (not strings)
- Support person/corporate kind
- Searchable for autocomplete
- Linked via `BibliographicAuthor` many-to-many

**Subjects**

- Normalized per library via `Subject` entities
- Support authority URI (LC, AGROVOC, etc.)
- Searchable for discovery
- Linked via `BibliographicSubject` many-to-many
- Legacy `BibliographicRecord.subjects String[]` deprecated for new writes

**Classification**

- Scheme + code + label per library
- Support multiple schemes: Dewey, UDC/CDU, LC, IBIC, custom
- Extensible for future:

```prisma
model ClassificationScheme {
  id    String @id @default(cuid())
  code  String @unique  // "dewey", "udc", "lc", "ibic", "custom"
  name  String
}

model Classification {
  schemeCode String
  scheme     ClassificationScheme @relation(fields: [schemeCode], references: [code])
  code       String               // e.g., "821.61" (Dewey)
  label      String?              // e.g., "Spanish fiction"
  libraryId  String
  library    Library @relation(fields: [libraryId], references: [id])

  @@unique([libraryId, schemeCode, code])
}
```

### 5.3 MARC21 Support

`MarcRecord` stores MARC data for:
- Import/export workflows
- Compliance with standards
- Preserving complex encoding

```prisma
model MarcRecord {
  id        String
  recordId  String @unique
  record    BibliographicRecord
  leader    String?           // 24 characters
  directory Json?             // directory entries
  metadata  Json?             // local extensions
  fields    MarcField[]       // MARC fields 001-999
}

model MarcField {
  tag       String            // "245", "650", etc.
  ind1      String?           // first indicator
  ind2      String?           // second indicator
  value     String?           // non-repeating subfield (rare)
  subfields MarcSubfield[]    // ‡a, ‡b, ‡c, etc.
}

model MarcSubfield {
  code  String  // "a", "b", "c", "d", etc.
  value String  // actual content
}
```

MARC21 is **not** the source of truth for domain data; it's a representation layer.

---

## 6. Circulation

### 6.1 Checkout Flow

```
1. Resolve member (scoped to tenant + library)
2. Scan item barcode (scoped to tenant + library)
3. Verify member status (ACTIVE, fines < limit, if configured)
4. Verify item status (AVAILABLE)
5. Check holds (if item-hold exists and queue member != current member, reject)
6. Load circulation policy (by member category, material type, library)
7. Calculate due date (loanDate + loanDays, consider holidays)
8. Create Loan transaction (Loan + Item status change + history + audit)
9. Confirm to circulation desk
```

### 6.2 Renewal Flow

```
1. Resolve loan
2. Verify renewal eligibility (< maxRenewals, no holds, not overdue)
3. Calculate new due date
4. Create LoanRenewal record
5. Update Loan with new dueDate
6. Audit
```

### 6.3 Return Flow

```
1. Resolve item
2. Resolve loan (ACTIVE)
3. Calculate overdue (actual return - due date, consider grace days)
4. If overdue > 0, create Fine with reason="OVERDUE"
5. Update Loan status (ACTIVE → RETURNED)
6. Update Item status (ON_LOAN → AVAILABLE)
7. Check holds: if queue exists, set item status to ON_HOLD for next member
8. Create ItemStatusHistory + audit
```

### 6.4 Holds

```
Member places hold on Record/Item:
1. Load hold policy from circulation policy
2. Queue member with priority = next available
3. When item becomes available:
   - Item status = ON_HOLD
   - Send notification to member
   - Hold status = READY
4. Member picks up within X days
   - Hold status = FULFILLED
5. If expiration reached:
   - Hold status = EXPIRED
   - Item returns to AVAILABLE
```

---

## 7. Fines & Accounts

### 7.1 Ledger

`MemberAccountTransaction` is the source of truth:

```prisma
model MemberAccountTransaction {
  id          String
  memberId    String
  type        TransactionType  // CHARGE, PAYMENT, WAIVER, ADJUSTMENT
  amount      Decimal
  reason      String
  relatedId   String?          // fineId, loanId, etc.
  createdAt   DateTime
  createdBy   String?          // actor (system if auto, userId if manual)
}
```

Derived: `memberBalance = SUM(type:CHARGE) - SUM(type:PAYMENT) + SUM(type:ADJUSTMENT)`

### 7.2 Automatic Fines

On return, if overdue:

```typescript
const overdueDays = Math.floor(
  (returnDate - loan.dueDate) / (24 * 60 * 60 * 1000)
);

if (overdueDays > policy.graceDays) {
  const chargeableDays = overdueDays - policy.graceDays;
  const fineAmount = chargeableDays * policy.dailyFine;

  await db.memberAccountTransaction.create({
    data: {
      memberId,
      type: 'CHARGE',
      amount: fineAmount,
      reason: `OVERDUE: ${chargeableDays} days @ ${policy.dailyFine}/day`,
      relatedId: loan.id
    }
  });
}
```

### 7.3 Payments & Waivers

```typescript
// Payment
await db.memberAccountTransaction.create({
  data: {
    memberId,
    type: 'PAYMENT',
    amount: paymentAmount,
    reason: 'Payment received',
    createdBy: ctx.userId
  }
});

// Waiver (admin decision)
await db.memberAccountTransaction.create({
  data: {
    memberId,
    type: 'WAIVER',
    amount: fineAmount,
    reason: 'Waived by ' + actor.name,
    createdBy: ctx.userId
  }
});
```

---

## 8. AI & Automation

### 8.1 Design Principles

- **Tool-based:** AI accesses library data through defined, permission-scoped tools
- **Audited:** every AI action is logged with prompt, model, decision, and approval
- **Authorized:** AI never bypasses RBAC; operations are attributed to AI actor with clear logging
- **Non-invasive:** AI provides recommendations, not automatic mutations

### 8.2 Use Cases

#### Cataloging Assistant

```typescript
// Librarian uploads ISBN or provides title
const suggestions = await catalogingAssistant({
  isbn?: string,
  title?: string,
  authors?: string[]
});

// Returns:
{
  title: "...",
  subtitle: "...",
  description: "...",
  authors: [{ name: "...", kind: "PERSON" }],
  publisher: { name: "..." },
  year: 2024,
  language: "es",
  subjects: [{ term: "...", authorityUri: "..." }],
  classification: { scheme: "dewey", code: "...", label: "..." },
  coverUrl: "..."
}

// Librarian reviews and approves → creates BibliographicRecord
```

#### Discovery Intelligence

```typescript
// Semantic search
const results = await semanticSearch({
  query: "novelas contemporáneas de ciencia ficción",
  libraryId,
  limit: 20
});

// Returns ranked results by relevance, author, rating, etc.
```

#### Circulation Intelligence

```typescript
// Overdue prediction
const atRisk = await overduePredictor({
  libraryId,
  daysAhead: 7
});

// Returns members likely to have overdue items within 7 days
// Used for proactive notifications
```

#### Collection Analysis

```typescript
// Demand forecasting
const forecast = await demandForecast({
  libraryId,
  materialType: "BOOK",
  daysAhead: 90
});

// Returns predicted checkout volume by classification, recommends acquisitions
```

### 8.3 Implementation

```typescript
// AI is sandboxed: tools define access boundaries
interface AITool {
  name: string;
  description: string;
  permission: string;  // e.g., "catalog:read"
  execute: (ctx: AuthorizationContext, params: unknown) => Promise<unknown>;
}

const tools: AITool[] = [
  {
    name: "search_bibliographic_records",
    description: "Search for existing records by title/author",
    permission: "catalog:read",
    execute: async (ctx, { title, author, limit }) => {
      return await searchRecords(ctx, { title, author, limit });
    }
  },
  {
    name: "get_member_account",
    description: "Retrieve member account info (fines, loans, holds)",
    permission: "members:read",
    execute: async (ctx, { memberId }) => {
      return await getMemberAccount(ctx, memberId);
    }
  }
];

// AI agent receives context + tools, never direct DB access
const result = await aiAgent.run({
  systemPrompt: "You are a library cataloging assistant...",
  userPrompt: "Find the book 'El Quijote' and suggest metadata",
  tools: tools.filter(t => ctx.isAllowedAction(t.permission)),
  maxSteps: 5
});

// Log the AI execution
await db.auditLog.create({
  data: {
    tenantId: ctx.tenantId,
    userId: "AI:cataloging-assistant", // system actor
    action: "AI_EXECUTION",
    entity: "AIAgent",
    entityId: result.executionId,
    after: result.outcome,
    result: result.success ? 'SUCCESS' : 'FAILURE'
  }
});
```

---

## 9. Migrations & Interoperability

### 9.1 Espabiblio → BiblioNexus

Data migration from Espabiblio MySQL (35 tables) to BiblioNexus PostgreSQL:

| Espabiblio | BiblioNexus | Transformation |
|-----------|------------|---|
| `biblio` | `BibliographicRecord` | title, subtitle, description, year, language |
| `biblio_copy` | `Item` | barcode, status, condition, price |
| `biblio_field`, `biblio_copy_fields` | `BibliographicRecord` fields, `Edition` | normalize into schema |
| `cdd`, `cdu`, `ibic` | `Classification` | code + scheme + label |
| `member` | `Member` | name, email, phone, status |
| `checkout_privs` | `CirculationPolicy` + `MemberCategory` | loan days, max loans, renewals |
| `staff` | `User` + `UserRole` | email, name, role assignment |
| `transaction_type_dm` | `TransactionType` enum | CHARGE, PAYMENT, WAIVER, ADJUSTMENT |

### 9.2 Migration Phases

1. **Export:** Extract from Espabiblio MySQL to normalized CSV/JSON
2. **Validate:** Checksum, row count, referential integrity
3. **Transform:** Map to BiblioNexus domain (apply defaults, resolve references)
4. **Load:** Bulk insert to PostgreSQL (respecting new PK generation)
5. **Reconcile:** Verify counts, spot-check records, validate scope
6. **Audit Trail:** Record legacy IDs for traceability

### 9.3 Interoperability

- **MARC21 export:** `MarcRecord` → ISO2709 format
- **OPAC API:** REST/GraphQL for discovery systems
- **NCIP support:** National library protocol for item lookup
- **Z39.50 optional:** legacy library protocol
- **EDIFACT support:** acquisitions data exchange

---

## 10. Testing & Validation

### 10.1 Required Tests

**Unit:**
- Authorization guards (permission checks, scope validation)
- Policy calculations (due dates, fines, renewals)
- Domain validators (email, barcode format, ISBN)

**Integration (PostgreSQL):**
- CRUD operations per entity
- Tenant/library/branch isolation
- Checkout/return/renew workflows
- Concurrent checkout (race condition handling)
- Hold queue management
- Idempotency key behavior
- Audit log completeness
- MARC import/export round-trip

**E2E:**
- Complete circulation desk workflow
- Member account and fine management
- Catalog search and discovery
- Admin panel navigation and actions

### 10.2 Definition of Done

A feature is DONE only when:

1. ✓ UI rendered (no placeholder)
2. ✓ Server action/API implemented
3. ✓ Service logic complete
4. ✓ Database schema supporting it
5. ✓ Authorization enforced server-side
6. ✓ Tenant/library/branch scoping applied
7. ✓ Audit log recorded
8. ✓ Error handling (auth failure, resource not found, validation)
9. ✓ Loading/empty/error states
10. ✓ Integration tests passing
11. ✓ Typecheck clean
12. ✓ Lint clean
13. ✓ Production build successful
14. ✓ i18n for es/en/pt-BR

---

## 11. Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Node.js 22+ | LTS, stable |
| Framework | Next.js 16 (App Router) | Server components, edge functions |
| Database | PostgreSQL 15+ | Relational integrity, JSONB, full-text search |
| ORM | Prisma | Type-safe, migrations, transactions |
| Auth | Better Auth | Lightweight, self-hosted, no third-party |
| UI Framework | React 19 | Server/client components, hooks |
| Components | shadcn/ui | Accessible, Tailwind, customizable |
| Styling | Tailwind CSS | Utility-first, responsive |
| Forms | React Hook Form + Zod | Validation, submission handling |
| API | Next.js Server Actions + Route Handlers | Native, no extra framework |
| Querying | SWR (client), Prisma (server) | Real-time sync, caching |
| i18n | Custom (lightweight) | es, en, pt-BR; no heavy dependency |
| Testing | Vitest + Playwright | Unit + E2E, fast feedback |
| CI/CD | GitHub Actions | Native, integrated |
| Deployment | Vercel | Optimized for Next.js, edge functions |
| Observability | Vercel Analytics + custom AuditLog | Built-in + domain-aware logging |

---

## 12. Roadmap Overview

### Phase 0 (Complete)
- Multi-tenant foundation
- Better Auth setup
- RBAC foundation
- Dashboard + sidebar navigation
- Admin user/role management

### Phase 1 (Current: Cycles 3-7)
- Catalog CRUD (records, authors, publishers, subjects, classifications)
- Inventory management (holdings, items, material types, shelf locations)
- Member management (categories, CRUD, bulk operations)
- Circulation desk (checkout, return, renewal, holds)
- Fines & accounts

### Phase 2 (Future)
- OPAC/discovery refinement
- MARC21 import/export
- Acquisitions (PO, vendor management, receiving)
- Serials (subscription, receipt, claims)
- Digital resources
- Reports & dashboards
- AI integrations (cataloging assistant, discovery, recommendations)
- Integrations (ILL, external catalogs, payment processors)

---

## 13. Decision Log

### 13.1 Why Separate BibliographicRecord from Item?

**Decision:** FRBR-inspired separation (work → edition → exemplar)

**Rationale:**
- One book title can have multiple editions (different publishers, years, languages)
- Multiple physical copies (items) can be instances of the same edition
- Searching should return "Persuasion" once, with item counts per branch
- Circulation operates on items, not records

**Alternative rejected:** Single entity (like Espabiblio `biblio_copy` for both)
- Confuses bibliographic search with inventory search
- Complicates item addition (must duplicate record data)
- Makes international standards integration harder

### 13.2 Why Normalize Subjects, Classifications, Materials?

**Decision:** Entities instead of strings; authority URIs support

**Rationale:**
- Consistent vocabulary prevents typos and search misses
- Authority URIs (LOC, AGROVOC) enable future semantic search
- Per-library scoping allows different classification schemes
- Enables AI-assisted subject extraction

**Alternative rejected:** Strings in record (like current `subjects String[]`)
- No deduplication; "Science" vs "science" are different
- No search/autocomplete without full-text index
- Cannot be linked to authority standards
- Breaks aggregation queries

### 13.3 Why IdempotencyKey Instead of DB Constraints?

**Decision:** Explicit idempotency key table + short TTL cache

**Rationale:**
- Network retries must return same result (same Loan ID, not duplicate)
- Deterministic key generation from checkout parameters
- Fast lookup in cache before executing business logic
- TTL prevents unbounded growth
- Works with distributed checkout (branch servers, edge functions)

**Alternative rejected:** Unique constraints on (member, item, date)
- Would reject retry with different error
- Cannot distinguish "same network retry" from "user trying again tomorrow"
- Harder to debug

### 13.4 Why Custom i18n Instead of i18next?

**Decision:** Lightweight, organized by domain (catalog, circulation, admin)

**Rationale:**
- es, en, pt-BR only (not 20+ languages)
- Message organization by module makes maintenance easier
- Minimal bundle size impact
- Type-safe message keys via constants
- Database-backed translations for admin customization

**Alternative rejected:** i18next
- Overkill for 3 languages
- Heavy dependency (+ plugins)
- Namespace management adds complexity

### 13.5 Why Audit Everything?

**Decision:** Immutable AuditLog for every mutation

**Rationale:**
- Legal compliance (many countries require audit trails)
- Debugging (who changed what, when)
- Accountability (staff actions traced)
- Reconciliation (legacy data questions, migration validation)
- AI governance (track AI recommendations and approvals)

**Alternative rejected:** Logging to file/syslog
- Unreliable (can be deleted)
- Not queryable from UI
- Cannot correlate with database state

---

## 14. Non-Goals & Constraints

### Non-Goals
- Real-time barcode scanning (USB barcode readers emulate keyboard input; handled at UI level)
- Automatic RFID integration (planned for Phase 3)
- Mobile native app (responsive web is sufficient)
- Standalone offline mode (sync-on-reconnect possible in Phase 2)
- Support for proprietary OPAC portals (standards-based API only)

### Constraints
- Single timezone per library (no multi-timezone checkout)
- No currency conversion (fines in library's configured currency)
- English/Spanish/Portuguese only (Phase 2+ can add languages)
- PostgreSQL only (no MySQL, Oracle, etc.)
- Vercel deployment (serverless functions, edge computing)

---

## 15. Contact & Governance

**Repository:** `dernys/biblionexus`  
**Architecture Owner:** Lead Architect  
**Tech Leads:** Database, Backend, Frontend, AI/ML  
**Approval Process:** Architecture Decision Records (ADRs) for changes to this document

---

**End of Architecture Document**
