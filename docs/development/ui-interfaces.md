# BiblioNexus — documentación de desarrollo de interfaces

## Objetivo

Las interfaces administrativas deben ser superficies operativas conectadas a PostgreSQL. Una pantalla no se considera funcional por renderizar datos: cada mutación debe seguir el flujo:

`UI → Server Action/API → AuthorizationContext → Service → Prisma transaction → AuditLog`

La UI puede ocultar acciones no permitidas, pero la decisión definitiva siempre ocurre en el servidor.

## Arquitectura de rutas

- `/` — landing pública con acceso y registro.
- `/sign-in` y `/sign-up` — autenticación Better Auth con email/password.
- `/dashboard` — Command Center protegido.
- `/catalog` — registros bibliográficos y búsqueda administrativa.
- `/catalog/inventory` — holdings, items y estados físicos.
- `/members` — gestión de miembros y estado de circulación.
- `/circulation/loans`, `/circulation/returns`, `/circulation/renewals` — operaciones de mostrador.
- `/admin/users` — usuarios, asignaciones y scopes.
- `/admin/roles` — roles y permisos.
- `/settings` — configuración contextual.
- `/opac/search` y `/opac/book/[id]` — catálogo público.

Las rutas administrativas se protegen en el Server Component mediante `auth.api.getSession`. Las acciones y APIs vuelven a resolver sesión, permisos y scopes; nunca confían en IDs enviados por el navegador.

## Shell y navegación

`components/app-shell.tsx` es el shell compartido para módulos administrativos. El dashboard (`components/biblio-dashboard.tsx`) mantiene su composición visual propia, pero sus botones de sidebar deben ser navegables y usar `router.push` con rutas explícitas. Cada entrada debe:

- tener `type="button"`;
- tener un destino definido en el mapa de rutas;
- marcarse activa con `usePathname`;
- funcionar con sidebar contraído y expandido;
- cerrar el drawer móvil cuando aplique;
- no depender de navegación estática ni de `localStorage` para permisos.

El estado de colapso es una preferencia visual; no representa autorización.

## Modelo de dominio Prisma

La jerarquía organizativa es:

`Tenant → LibraryNetwork → Library → Branch`

Los usuarios pertenecen a un tenant y reciben roles mediante `UserRole`, opcionalmente acotados por `libraryId` y `branchId`. El catálogo separa:

`BibliographicRecord → Edition → Holding → Item`

Las entidades con reglas o scope propio se consultan desde sus modelos normalizados: `Subject`, `Classification`, `MaterialType`, `Collection`, `ShelfLocation` y `CirculationPolicy`. Un `Item` físico conserva su estado y su `ItemStatusHistory`.

## Reglas de implementación por interfaz

### Usuarios, roles y permisos

- Validar email, nombre, estado y asignaciones con esquema de entrada.
- Resolver `AuthorizationContext` desde la sesión real y `UserRole`.
- Impedir que un administrador contextual asigne `PLATFORM_ADMIN`.
- Verificar que library y branch pertenecen al tenant solicitado.
- Auditar creación, actualización, desactivación y cambios de roles.

### Catálogo

- Filtrar siempre por tenant y library scope.
- Verificar que autores, subjects, publishers, collections y material types pertenecen al mismo contexto.
- No representar un registro bibliográfico como ejemplar físico.
- Validar identificadores y barcode con unicidad contextual.

### Miembros

- Aplicar scope de library/branch según la asignación del operador.
- Mostrar por separado préstamos activos, vencidos, holds, multas, pagos e historial.
- No duplicar datos derivables desde `Loan`, `Hold` y transacciones financieras.

### Circulación

Checkout, return y renew deben reutilizar los servicios transaccionales existentes. Cada operación valida miembro, item, branch, restricciones, política, idempotency key y concurrencia antes de persistir `Loan`, historial de item y `AuditLog`.

El campo de barcode debe ser un input normal para aceptar lectores USB que emulan teclado. No se debe asumir hardware especializado.

## Estados de entrega

- **DONE:** UI, backend, persistencia, autorización, scopes, validaciones, errores, auditoría y pruebas pasan.
- **PARTIAL:** existe una parte funcional, pero falta una capa o cobertura.
- **IMPLEMENTED / BLOCKED VERIFICATION:** código implementado, pero una dependencia externa impide validar runtime.
- **BLOCKED:** no se permite sustituir la dependencia por mocks o bypasses.

## Validación mínima por ciclo

1. Ejecutar `pnpm test`.
2. Ejecutar `pnpm typecheck`.
3. Ejecutar `pnpm build` cuando cambien rutas, configuración o dependencias.
4. Ejecutar `pnpm db:check` y comprobar migraciones cuando cambie Prisma.
5. Verificar en navegador navegación directa, refresh, estados de error y responsive.
6. Revisar que no haya errores de consola ni rutas muertas.

## Próximo trabajo recomendado

Completar el ciclo Users → Roles → Permissions con formularios de creación/edición conectados a acciones server-side, validación contextual de asignaciones y pruebas de privilege escalation. Después continuar con Tenant → Library → Branch antes de ampliar el catálogo.

Las credenciales del seed son exclusivamente `DEVELOPMENT ONLY` y nunca deben reutilizarse en producción.
