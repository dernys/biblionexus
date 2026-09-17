# BiblioNexus — Contratos P0/P1/P2

## Estado de implementación

| Área | Estado | PostgreSQL | Prisma | RBAC | Tests | Observaciones |
|---|---|---:|---:|---:|---:|---|
| Auth/sesiones | BLOCKED | PARTIAL | PARTIAL | BLOCKED | PARTIAL | `requireSession` fail-closed; falta adaptar Better Auth y `BETTER_AUTH_SECRET`. |
| Tenancy/scopes | PARTIAL | VERIFIED | PARTIAL | IMPLEMENTED | IMPLEMENTED | Guards de tenant/library/branch y UserRole contextual; falta sesión real. |
| Catalog | PARTIAL | VERIFIED | PARTIAL | PARTIAL | NOT STARTED | Modelo bibliográfico existente; normalización de subjects/materials/classification en esta iteración. |
| Members | PARTIAL | VERIFIED | PARTIAL | PARTIAL | NOT STARTED | MemberCategory normalizada; CRUD de servicio pendiente. |
| Circulation | PARTIAL | VERIFIED | PARTIAL | PARTIAL | PARTIAL | Checkout/return/renew server-side; política configurable y tests de integración pendientes. |
| MARC21 | PARTIAL | VERIFIED | IMPLEMENTED | PARTIAL | NOT STARTED | MarcRecord/Field/Subfield permiten evolución; falta validación/orden formal. |
| OPAC | PARTIAL | VERIFIED | PARTIAL | PARTIAL | NOT STARTED | Superficie UI existente; disponibilidad real y cuenta pendientes. |

## Convención obligatoria

`UI → Server Action/API → Service → Authorization → Prisma transaction`

Los componentes nunca importan Prisma. Cada servicio recibe `AuthorizationContext`, valida el scope del recurso desde PostgreSQL y registra `AuditLog` para mutaciones sensibles.

## P0 — Fundación operativa

### Identidad y seguridad

- **Actor:** usuario autenticado o sistema de identidad.
- **Scopes:** platform, tenant, library, branch.
- **Entrada:** credenciales/sesión, acción, recurso.
- **Validaciones:** sesión presente, no expirada/revocada, tenant compatible, permiso y scope.
- **Servicio:** adaptador Better Auth + `lib/authorization.ts`.
- **Errores:** `AuthenticationRequired`, `SessionExpired`, `AuthorizationDenied`.
- **Auditoría:** login, logout, denegación y cambios RBAC.
- **Estado:** BLOCKED hasta configurar `BETTER_AUTH_SECRET`; no se simula autenticación.

### Catálogo

- **Actor:** catalogador o administrador de biblioteca.
- **Scope:** tenant obligatorio; library para registros y branch para holdings/items.
- **Entidades:** `BibliographicRecord`, `Author`, `Publisher`, `Edition`, `Identifier`, `Holding`, `Item`, `Subject`, `Classification`, `MaterialType`, `Collection`, `ShelfLocation`.
- **Validaciones:** unicidad contextual, relaciones pertenecientes al mismo tenant/library, barcode único.
- **Estado:** PARTIAL; lectura de catálogo existente, contratos CRUD y validadores pendientes.

### Miembros

- **Actor:** librarian/circulation staff.
- **Scope:** library obligatorio; branch cuando la operación es local.
- **Entidades:** `Member`, `MemberCategory`, `MemberNote`.
- **Validaciones:** member number/barcode único en biblioteca, estado elegible, PII mínima.
- **Estado:** PARTIAL.

### Circulación

- **Checkout:** valida permiso, branch, miembro activo, multas abiertas, material loanable, disponibilidad, política e idempotency key; transacción crea `Loan`, cambia `Item`, crea historial y auditoría.
- **Return:** valida préstamo y branch, calcula overdue con `CirculationPolicy`, crea asiento de multa, devuelve item, historial y auditoría.
- **Renew:** valida política, límite, hold y estado; crea `LoanRenewal` y auditoría.
- **Errores:** recurso fuera de scope, miembro suspendido, item no disponible, hold bloqueante, idempotencia conflictiva.
- **Estado:** PARTIAL; el servicio existe, pero falta política seleccionada desde DB, locking SQL verificado y pruebas PostgreSQL de concurrencia.

## P1 — Operación posterior

OPAC/discovery, holds avanzados, multas/pagos, inventario, reportes, dashboards y notificaciones. Ningún módulo P1 se declara terminado por la existencia de una pantalla.

## P2 — Evolución

MARC21 completo, import/export con rollback, adquisiciones, seriadas, digital, migración Espabiblio/OpenBiblio e interoperabilidad. Los modelos actuales conservan extensibilidad para estas fases.

## Criterios de aceptación P0

1. Toda mutación sensible requiere sesión real, permiso y scope server-side.
2. Toda circulación se ejecuta en transacción y es idempotente.
3. Tenant A no puede leer ni mutar Tenant B, incluso con IDs manipulados.
4. Usuarios limitados a una branch no pueden operar otra.
5. Seed de desarrollo es reproducible, explícito y no contiene secretos reales.
6. `db:check`, typecheck, tests y build pasan antes de declarar VERIFIED.

## Decisiones

- Se conserva la separación `BibliographicRecord → Edition → Holding → Item → Loan`.
- Se normalizan entidades que necesitan reglas, relaciones o scope: categorías, materiales, materias, clasificación, estanterías y políticas.
- Se mantiene `subjects String[]` temporalmente por compatibilidad de lectura/importación; `Subject`/`BibliographicSubject` es la fuente normalizada para nuevas escrituras.
- Sesiones actuales quedan en transición: no se expone `token` ni se declara segura hasta migrar al adaptador Better Auth con hash/revocación.
- No se introducen roles nuevos; los roles existentes se contextualizan mediante `UserRole.libraryId/branchId`.

## Pruebas necesarias

Unitarias: guards, permiso, jerarquía de scope, validadores. Integración PostgreSQL: CRUD catalog/member, aislamiento tenant/branch, checkout/return/renew, overdue/fine, holds, idempotencia y concurrencia. Auth: sesión ausente, válida, expirada y revocada una vez Better Auth esté configurado.

## Datos de desarrollo

El seed existente es `DEVELOPMENT ONLY`, idempotente y no debe usarse como credencial de producción. La ampliación de escenarios queda condicionada a ejecutar contra la base configurada y a no inventar autenticación.
