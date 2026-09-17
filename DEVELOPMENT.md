# BiblioNexus — Development Guide

## 1. Alcance y estado verificable

BiblioNexus es un ILS web multi-tenant en Next.js 16, React 19, PostgreSQL y Prisma. Este documento distingue explícitamente entre código existente, persistencia disponible y capacidades pendientes.

**Porcentaje canónico de avance:** no calculado. No existe todavía una matriz de evidencia completa para justificar un porcentaje sin inventar progreso.

### Estado actual auditado

| Capacidad | UI | Backend | Persistencia | Seguridad | Estado |
|---|---:|---:|---:|---:|---|
| Auth email/password | Sí | Better Auth | Sí | Parcial | PARTIAL |
| Tenant/library/branch | Parcial | Guards parciales | Sí | Parcial | PARTIAL |
| Dashboard/sidebar | Sí | No aplica | No aplica | Sesión | PARTIAL |
| Usuarios/roles | Sí | Acciones parciales | Sí | Parcial | PARTIAL |
| Catálogo | Parcial | Repository/servicios incompletos | Sí | Parcial | PARTIAL |
| Miembros | Parcial | Incompleto | Sí | Parcial | PARTIAL |
| Circulación | Parcial | Servicio base | Sí | Parcial | PARTIAL |
| OPAC | Parcial | Incompleto | Sí | Parcial | PARTIAL |
| MARC21 | Parcial | Incompleto | Sí | Parcial | PARTIAL |
| Adquisiciones | No | No | No | No | MISSING |
| Seriadas | Parcial | Incompleto | Sí | Parcial | PARTIAL |
| Biblioteca digital | Parcial | Incompleto | Sí | Parcial | PARTIAL |
| IA | No | No | No | No | MISSING |

## 2. Arquitectura obligatoria

```text
UI → Server Action/API → AuthorizationContext → Service/use case → Scoped repository → Prisma transaction → AuditLog
```

Los componentes React no importan Prisma. El cliente no puede elegir arbitrariamente `tenantId`, `libraryId` o `branchId`; esos valores se derivan de la sesión, asignaciones y contexto validado en servidor.

Toda mutación sensible requiere:

- sesión válida;
- permiso de acción;
- scope tenant/library/branch;
- validación de entrada;
- transacción cuando modifica varias entidades;
- idempotencia cuando pueda reintentarse;
- auditoría sin passwords, tokens ni PII innecesaria;
- estados de error, carga, vacío y acceso denegado.

## 3. Modelo Prisma actual y brechas

El esquema actual ya contiene la columna vertebral correcta:

```text
Tenant → LibraryNetwork → Library → Branch
BibliographicRecord → Edition → Holding → Item → Loan
Member → Loan/Hold/Fine/MemberAccountTransaction
User → Role → Permission → UserRole
```

### Correcciones prioritarias antes de ampliar interfaces

1. **Integridad tenant:** `LibraryNetwork`, `Library`, `Member`, `BibliographicRecord`, `Collection`, `MaterialType`, `Subject`, `Classification` y `CirculationPolicy` deben validarse contra el mismo tenant en servicios. El schema no puede depender solamente de IDs individuales.
2. **Scope de UserRole:** el modelo actual usa `libraryId` y `branchId`, pero no tiene un `tenantId` explícito. El servicio debe comprobar que ambas relaciones pertenecen al tenant del usuario antes de crear o usar una asignación.
3. **Catalogación:** `BibliographicRecord.subjects String[]` y los campos legacy `classification`/`materialType` se conservan sólo para compatibilidad. Nuevas escrituras usan `Subject`, `BibliographicSubject`, `Classification` y `MaterialType`.
4. **ClassificationScheme:** falta una entidad independiente para soportar Dewey, CDU/UDC, IBIC, LC y esquemas personalizados sin codificar el esquema en un String libre.
5. **Circulación:** `MemberCategory` y `CirculationPolicy` aún no expresan toda la combinación MemberClassification + MaterialType + Library/Branch + calendario de festivos. No construir reglas completas de UX hasta cerrar ese contrato.
6. **Ledger:** `MemberAccountTransaction` debe ser la fuente contable; `Fine` y `FinePayment` necesitan referencias y reglas de conciliación para evitar balances duplicados.
7. **MARC:** existen `MarcRecord`, `MarcField` y `MarcSubfield`, pero faltan definiciones de tags, indicadores, repetibilidad, validación, mappings e import/export formal.
8. **Integraciones futuras:** adquisiciones, digital, notificaciones avanzadas, IA y migración Espabiblio necesitan modelos y servicios propios; no se deben simular con arrays de frontend.

## 4. Matriz de interfaces

| Interfaz | Ruta | Dominio | Persistencia actual | Servicio/repository | Permiso/scope | Estado |
|---|---|---|---|---|---|---|
| Landing | `/` | Discovery/auth entry | No requiere datos operativos | No | Público | PARTIAL |
| Sign in/up | `/sign-in`, `/sign-up` | Identity | User/Account/Session | Better Auth | Auth | PARTIAL |
| Command Center | `/dashboard` | Overview | Parcial | Dashboard queries pendientes | Sesión + tenant | PARTIAL |
| Users | `/admin/users` | Identity/RBAC | User/UserRole | `admin-users` parcial | Admin + tenant | PARTIAL |
| Roles | `/admin/roles` | RBAC | Role/Permission | Lectura parcial | Admin | PARTIAL |
| Catalog | `/catalog` | Bibliografía | Record/Author/etc. | Repository parcial | catalog:read + library | PARTIAL |
| Inventory | `/catalog/inventory` | Holdings/items | Holding/Item | Pendiente | inventory + branch | PARTIAL |
| Members | `/members` | Patronos | Member/category | Pendiente | members + library | PARTIAL |
| Circulation | `/circulation/*` | Préstamos | Loan/Hold/Fine | `lib/services/circulation.ts` | circulation + branch | PARTIAL |
| OPAC | `/opac/*` | Discovery público | Record/Item | Pendiente | Público | PARTIAL |

Cada nueva interfaz debe añadir una fila con evidencia de UI, modelo, repository, caso de uso, permiso, scope, auditoría y tests.

## 5. Orden de implementación

### Fase 0 — Seguridad y contratos

- cerrar Better Auth y sesiones reales;
- `AuthorizationContext` fail-closed;
- repositories scoped;
- validadores comunes;
- auditoría y errores de dominio;
- pruebas de aislamiento tenant/library/branch.

### Fase 1 — Organización

- Tenant, networks, libraries, branches;
- selector de contexto en shell;
- configuración y calendarios;
- usuarios, invitaciones, scopes y permisos por acción.

### Fase 2 — Catálogo e inventario

- Records, authority, editions, identifiers;
- ClassificationScheme y normalización de subjects;
- holdings, items, material types, shelf locations;
- editor MARC con validación y mapping normalizado.

### Fase 3 — Miembros y circulación

- directory/detail/cards/custom fields;
- checkout, return, renewal, holds;
- políticas compuestas y festivos;
- ledger, fines, pagos, waivers y recibos;
- transferencias con eventos, despacho, recepción y reconciliación.

### Fase 4 — OPAC, adquisiciones y seriadas

- discovery público y cuenta de miembro;
- vendors, budgets, funds, purchase orders, receiving, invoices;
- serial subscriptions, issues, claims y kardex.

### Fase 5 — Digital, observabilidad e IA

- recursos, archivos/versiones/licencias/policies/access events;
- notifications/templates/deliveries/retries;
- audit explorer y métricas;
- AI providers/models/agents/prompts/tools/knowledge/embeddings/executions/recommendations/approvals/usage.

## 6. UX empresarial

Cada módulo debe tener UX especializada, no CRUD genérico:

- command palette y shortcuts;
- tablas densas con filtros, orden, paginación, vistas guardadas y bulk actions;
- split view para catalogación y MARC;
- escáner de código de barras como input de teclado;
- paneles de detalle y timelines;
- loading, empty, error, denied, offline y sync states;
- responsive y WCAG 2.2 AA;
- i18n `es`, `en`, `pt-BR`;
- acciones sensibles confirmadas y auditadas.

## 7. Migración Espabiblio

Flujo obligatorio:

```text
MySQL legacy → staging → validation → normalization → transformation → PostgreSQL → reconciliation
```

Mapping inicial:

| Legacy | Destino BiblioNexus |
|---|---|
| biblio | BibliographicRecord |
| biblio_copy | Item + Holding |
| biblio_field / biblio_copy_fields | MarcRecord/Field/Subfield + normalized domain |
| biblio_hold | Hold |
| biblio_status_hist | ItemStatusHistory |
| collection_dm | Collection |
| material_type_dm | MaterialType |
| mbr_classify_dm | MemberCategory |
| checkout_privs | CirculationPolicy |
| member/member_account/member_fields | Member + ledger + custom fields |
| staff/session | User + Session |
| settings/lookup_* / cover_options | LibrarySetting + integration config |
| transaction_type_dm | TransactionType |
| usmarc_* / material_usmarc_xref | MARC definitions and mappings |
| cdd/cdu/ibic/cutter | ClassificationScheme/Reference + rules |

Legacy IDs deben conservarse en una estrategia explícita de reconciliación; no se destruye información ni se importa directamente a tablas finales sin staging.

## 8. IA segura

La IA nunca accede directamente a Prisma:

```text
AI → tool registry → permission check → scoped domain service → transaction → audit
```

Las recomendaciones requieren aprobación humana antes de mutaciones catalográficas, circulación, finanzas o configuración. Las ejecuciones registran modelo, prompt version, herramientas, resultado, uso y aprobación sin almacenar secretos.

## 9. Definition of Done

Una capacidad sólo es `COMPLETE` cuando incluye UI, servidor, caso de uso, repository scoped, validación, autorización, scope, transacción, idempotencia si aplica, auditoría, estados UX, tests, i18n, typecheck, lint, build y documentación. Si falta una capa se marca `PARTIAL`, no se oculta el faltante con mock.

## 10. Validación obligatoria

```text
pnpm prisma validate
pnpm prisma generate
pnpm prisma migrate status
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Una validación no ejecutada debe reportarse como no verificada. Actualmente `package.json` no define script `lint`; por eso `pnpm lint` no está disponible y queda como pendiente de configurar, no como resultado aprobado.

La build debe ejecutarse con las variables del proyecto cargadas. Si se ejecuta sin el entorno, Better Auth muestra advertencias de `BETTER_AUTH_SECRET` y `BETTER_AUTH_URL`; esto no debe confundirse con una validación runtime exitosa.

## 11. Documentos relacionados

- `docs/architecture/ARCHITECTURE.md` — decisiones y arquitectura objetivo.
- `docs/architecture/p0-contracts.md` — contratos P0/P1/P2.
- `docs/development/ROADMAP.md` — roadmap detallado por ciclos.
- `docs/development/ui-interfaces.md` — contratos UI y estados.
- `prisma/schema.prisma` — fuente actual de persistencia.
- `prisma/seed.ts` — datos exclusivamente de desarrollo.

Las credenciales del seed son DEVELOPMENT ONLY y nunca deben usarse en producción.

## 12. Riesgos abiertos

- Falta cerrar integridad referencial tenant-a-tenant con claves compuestas o validación transaccional.
- La política de circulación todavía tiene defaults que no sustituyen un motor de reglas.
- El ledger financiero requiere reconciliación formal.
- Adquisiciones, notificaciones avanzadas e IA no tienen aún persistencia completa.
- La matriz de tests de integración PostgreSQL debe ampliarse antes de declarar módulos completos.
- La referencia SQL de Espabiblio debe estar disponible como artefacto de staging para ejecutar la migración; no se debe inferir su contenido desde una pantalla.

**Regla de mantenimiento:** actualizar este documento y el roadmap en el mismo cambio que modifique dominio, rutas o contratos de interfaz.
``` 

---

**End of Development Guide**
