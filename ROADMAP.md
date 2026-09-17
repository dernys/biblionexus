# BiblioNexus — Roadmap Maestro de Desarrollo

> **Documento canónico:** este archivo (`ROADMAP.md`) integra el roadmap maestro previo con la especificación funcional ILS y el schema Prisma de referencia. `roadmap.md` existe únicamente como alias de compatibilidad y no debe contener una hoja de ruta independiente.
>
> **Regla de gobierno:** toda nueva iteración debe leer este documento antes de implementar, registrar decisiones aquí después de cada bloque significativo y no marcar una capacidad como `COMPLETE` hasta cumplir la definición de terminado.

## 0. Reconciliación arquitectónica y auditoría del schema

### Decisiones consolidadas

- Se conserva la separación **BibliographicRecord → Item → Loan** como eje del dominio.
- Se conserva el alcance multi-tenant **Tenant → Library → Branch** y se exige scope server-side en cada consulta administrativa.
- Se adopta el schema Prisma existente como base del proyecto; el schema adjunto se usa como referencia funcional, no como reemplazo literal.
- Se priorizan transacciones de dominio para circulación, multas, reservas, inventario y auditoría; la UI no escribirá Prisma directamente.
- MARC21 se mantiene extensible mediante `MarcRecord`, `MarcField` y `MarcSubfield`, con una capa posterior de normalización hacia `BibliographicRecord`.
- Better Auth queda bloqueado hasta disponer de `BETTER_AUTH_SECRET`; no se implementará una autenticación simulada.

### Hallazgos del schema vigente

- **Cubierto:** tenants, bibliotecas, sucursales, RBAC base, miembros, autoridades de autor/editorial, registros bibliográficos, ediciones, identificadores, holdings, ejemplares, préstamos, reservas, multas, auditoría, recursos digitales, seriadas, notificaciones, eventos, traducciones y sesiones.
- **Debe endurecerse antes de producción:** unicidad contextual de roles/permisos, índices de scope por tenant/library/branch, historial de estado de ejemplares, idempotency keys para comandos de circulación, eventos de transferencia, asientos de cuenta de miembro y entidades de importación/lookup.
- **Regla de integridad:** impedir dos préstamos activos para el mismo ejemplar mediante validación de servicio y, cuando sea compatible con Prisma/PostgreSQL, índice único parcial en migración SQL.
- **Regla de trazabilidad:** devolución, renovación, pago, condonación, importación, exportación y cambios de configuración deben producir `AuditLog` y eventos de dominio.
- **Regla de privacidad:** los datos de autenticación, credenciales de lookup y PII no se exponen en OPAC, logs ni respuestas no autorizadas.

### Estado de reconciliación

- Estado: **COMPLETE** para la consolidación documental; **NEEDS_REVIEW** para endurecimiento de schema y migraciones.
- Próxima tarea de datos: validar el schema contra PostgreSQL/Neon, corregir relaciones e índices, y crear migraciones reversibles antes de conectar comandos persistidos.

## 1. Norte estratégico

BiblioNexus debe evolucionar de un prototipo visual a un Integrated Library System (ILS) multi-tenant, multi-biblioteca y multi-sucursal, con dos superficies claramente separadas:

- **OPAC público:** descubrimiento, disponibilidad, reservas y cuenta del lector.
- **Workspace administrativo:** catalogación, circulación, miembros, inventario, adquisiciones, publicaciones seriadas, biblioteca digital, analítica, integraciones y gobierno.

Principios arquitectónicos:

1. Seguridad y autorización en servidor; nunca confiar únicamente en ocultar controles en la UI.
2. Datos reales y transacciones atómicas para circulación, inventario y pagos/multas.
3. Arquitectura multi-tenant con aislamiento por `tenantId` y alcance por biblioteca/sucursal.
4. API y servicios desacoplados de las pantallas para permitir reemplazar datos demo progresivamente.
5. Offline-tolerant para mostradores con sincronización explícita y auditoría completa.
6. Internacionalización desde el inicio: español, inglés y portugués brasileño.
7. Accesibilidad WCAG 2.2 AA, responsive y operación por teclado.

## 2. Estado actual y brechas

### Avance ejecutivo

**Progreso global estimado: 28% (NEEDS_REVIEW)**

- Fundación técnica: **78%** — Prisma 7, adapter PostgreSQL, configuración de datasource, repositorio inicial, seed reproducible, validadores de plataforma, scripts de typecheck/db-check, headers de seguridad y workspace modular de navegación incorporados.
- Identidad y autorización: **10%** — modelos RBAC preparados; Better Auth y enforcement server-side bloqueados hasta configurar `BETTER_AUTH_SECRET`.
- Catálogo y autoridades: **25%** — modelos bibliográficos y repositorio de consulta disponibles; importación, edición MARC y workflows pendientes.
- Circulación transaccional: **15%** — pantallas premium disponibles; comandos persistidos, idempotencia, transacciones y auditoría pendientes.
- OPAC y descubrimiento: **20%** — rutas y búsqueda base disponibles; disponibilidad real y cuenta de lector pendientes.
- Operación/observabilidad: **5%** — sin CI, jobs, logging estructurado ni pruebas automatizadas completas.

**Iteración activa:** Iteración 0 — Fundación técnica y control de alcance.
**Último hito:** seed reproducible, capa de plataforma compartida, scripts de validación y headers de seguridad.
**Siguiente hito:** configurar `BETTER_AUTH_SECRET`, implementar el adaptador Better Auth y completar pruebas de integración con PostgreSQL/Neon.

**Iteración de seguridad actual — estado: PARTIAL / BLOCKED**
- `AuthorizationContext` fail-closed, guards server-side y repositorios con scope obligatorio: **PARTIAL**.
- Circulación recibe contexto autorizado, valida jerarquía y audita transacciones: **PARTIAL**; falta sesión real y verificación contra Neon.
- Índice único parcial para impedir préstamos activos concurrentes: **NEEDS_REVIEW** hasta aplicar la migración en PostgreSQL.
- Tests unitarios de aislamiento/RBAC: **IMPLEMENTED**, pero tests de integración de circulación: **BLOCKED** por `BETTER_AUTH_SECRET` y entorno de base verificable.
- No se declara `COMPLETE` ninguna capacidad de autorización o circulación en esta iteración.


### Ya existe

- Shell administrativo premium con sidebar, command palette, tema, navegación responsive y contexto de sucursal.
- Rutas base de dashboard, catálogo, miembros, OPAC y configuración.
- Pantallas de circulación para préstamos, devoluciones, renovaciones, reservas y transferencias.
- Modelo Prisma amplio para tenants, bibliotecas, sucursales, usuarios/RBAC, catálogo MARC, ejemplares, miembros, préstamos, reservas, multas, eventos y auditoría.
- Repositorio inicial de catálogo y datos tipados de navegación, locales y permisos.

### Brechas críticas

- Better Auth pendiente hasta configurar `BETTER_AUTH_SECRET`.
- Prisma existe, pero faltan migraciones/seed productivo y servicios de dominio conectados a UI.
- RBAC actual es fundacional; falta enforcement real en servidor y pruebas de autorización.
- Circulación es principalmente una experiencia de workspace; faltan comandos transaccionales persistidos.
- Sin contrato API formal, validación centralizada, observabilidad, jobs, notificaciones ni sincronización offline real.
- Faltan módulos completos de adquisiciones, seriales, digital, inventario avanzado, reportes e integraciones.
- Auditoría del sidebar: `/acquisitions`, `/serials`, `/digital`, `/catalog/inventory`, `/reports`, `/analytics`, `/integrations`, `/audit` y `/settings` tenían una plantilla genérica o profundidad funcional insuficiente; quedan incorporados como workspaces premium de primera fase, con métricas, tabs, filtros, exportación, sincronización y estados operativos.
- Pendiente para cerrar estos módulos: conectar acciones a servicios Prisma, validación server-side, permisos por módulo, auditoría persistida, notificaciones y pruebas E2E.

## 3. Iteraciones de entrega

### Iteración 0 — Fundación técnica y control de alcance

**Objetivo:** convertir el prototipo en una base ejecutable y mantenible.

Entregables:

- Consolidar Next.js App Router, TypeScript estricto, Prisma y PostgreSQL/Neon.
- Definir convenciones de carpetas: `app`, `components`, `lib/domain`, `lib/repositories`, `lib/validators`, `lib/services`, `lib/jobs`.
- Configurar variables, entornos, logging estructurado, manejo de errores y headers de seguridad.
- Formalizar contratos de repositorios y casos de uso; eliminar dependencias de datos hardcodeados en nuevas pantallas.
- Crear seed reproducible con tenant demo, biblioteca, sucursales, roles, permisos, usuarios, catálogo, ejemplares, miembros y operaciones.
- Añadir CI: lint, typecheck, build, tests unitarios y smoke tests de rutas.

**Criterio de salida:** un entorno limpio puede levantar, sembrar datos y renderizar todas las rutas sin estados falsos ni errores de consola.

**Implementado en esta iteración:** `prisma/seed.ts` crea de forma idempotente un tenant demo, una biblioteca, dos sucursales, colección, autores, editor, registros bibliográficos, holdings, ejemplares y miembro demo. Ejecutar mediante `pnpm db:seed` cuando exista una base PostgreSQL accesible.

**Avance adicional:** el schema incorpora historial de estados de ejemplares, eventos de renovación, libro mayor de movimientos monetarios e idempotencia por tenant para comandos transaccionales. `pnpm db:check` valida y regenera Prisma correctamente. Estos modelos quedan en `NEEDS_REVIEW` hasta aplicar migración PostgreSQL y conectar servicios, permisos, auditoría y pruebas; no se consideran `DONE` por existir únicamente en el schema.

### Iteración 1 — Identidad, tenants y autorización

**Objetivo:** proteger la plataforma antes de persistir operaciones sensibles.

Entregables:

- Integrar Better Auth con email/password, sesiones seguras, cookies para preview y origins confiables.
- Alta, acceso, cierre de sesión, recuperación y verificación de cuenta.
- Modelo de pertenencia usuario-tenant-biblioteca-sucursal.
- RBAC basado en permisos de acción y alcance: tenant, biblioteca, sucursal, módulo y registro.
- Middleware/proxy para rutas protegidas y helpers server-side `requireSession`, `requirePermission` y `requireScope`.
- Pantallas de usuarios, roles, permisos, invitaciones y sesiones activas.
- Auditoría de login, cambios de permisos, invitaciones y denegaciones.

**Criterio de salida:** ningún endpoint o server action sensible funciona sin sesión y permiso adecuados; pruebas cubren acceso permitido, denegado y aislamiento entre tenants.

### Iteración 2 — Catálogo bibliográfico y autoridades

**Objetivo:** construir una fuente de verdad bibliográfica interoperable.

Módulos:

- Registros bibliográficos CRUD con borrador, publicación, archivado y versionado.
- Editor MARC21 por campos/subcampos, validación, indicadores y plantillas.
- Dublin Core para recursos digitales y mapeo MARC ↔ Dublin Core.
- Autores, entidades corporativas, materias, series, editoriales y autoridades.
- Identificadores ISBN, ISSN, DOI, OCLC y control de duplicados.
- Ediciones, holdings, signaturas, ejemplares, tipos de material y condiciones.
- Importación/exportación MARC21, CSV y JSON con preview, validación y rollback.
- Deduplicación, enriquecimiento, historial y auditoría.
- Búsqueda por relevancia, filtros, facetas, paginación y ordenación.

**Criterio de salida:** se puede crear un registro, asociar edición/holding/ejemplares, publicarlo en OPAC y mantener historial de cambios.

### Iteración 3 — Circulación transaccional

**Objetivo:** hacer operativos los mostradores y asegurar consistencia del inventario.

#### Préstamos

- Búsqueda/escaneo de miembro y código de barras.
- Validación de estado del miembro, límites, multas, bloqueos, elegibilidad y políticas por categoría/material.
- Cálculo de vencimiento, calendario de festivos y reglas de renovación.
- Préstamo individual y por lote.
- Recibo, impresión y notificación digital.

#### Devoluciones

- Escaneo de ejemplar, devolución rápida y devolución masiva.
- Cálculo de retraso, multas, daños y pérdida.
- Routing a reserva, estantería, cuarentena, reparación o transferencia.
- Cierre atómico de préstamo y actualización del ejemplar.

#### Renovaciones

- Renovación manual y automática.
- Bloqueo cuando existe reserva, límite alcanzado o sanción.
- Registro de número de renovaciones, nueva fecha y motivo.

#### Reservas / holds

- Cola FIFO configurable por sucursal, categoría y prioridad.
- Solicitud desde OPAC y back office.
- Estado queued, ready, fulfilled, cancelled y expired.
- Ventana de recogida, notificación y reasignación.

#### Transferencias

- Solicitud origen-destino, aprobación, picking, despacho, recepción y discrepancias.
- Estados y eventos por paquete/ejemplar.
- Inventario en tránsito y conciliación.

**Criterio de salida:** préstamos, devoluciones, renovaciones, holds y transferencias usan transacciones, idempotencia, locks apropiados, auditoría y actualización consistente de `Loan`, `Item`, `Hold` y multas.

### Iteración 4 — Miembros, multas y autoservicio

**Objetivo:** gestionar el ciclo completo del lector.

- Registro y edición de miembros, categorías, contactos y consentimiento.
- Tarjeta/barcode, estado, expiración y pertenencia a sucursal.
- Perfil 360°: préstamos, reservas, multas, notas, historial y preferencias.
- Políticas por categoría: límites, periodos, renovaciones, renovaciones bloqueadas y grace period.
- Multas, cargos por pérdida/daño, ajustes, condonaciones y recibos.
- Portal `/account`: préstamos actuales, historial permitido, renovaciones, reservas, multas y datos personales.
- Exportación/anonimización conforme a privacidad y retención.

### Iteración 5 — OPAC y descubrimiento público

**Objetivo:** entregar una experiencia de descubrimiento moderna y accesible.

- Inicio público, búsqueda, filtros/facetas y resultados.
- Ficha bibliográfica con disponibilidad por sucursal, formatos, materias y recursos relacionados.
- Disponibilidad en tiempo casi real.
- Reservar, guardar favoritos, alertas y listas personales.
- Cuenta de lector y control de privacidad.
- SEO, OpenGraph, sitemap, schema.org y URLs estables.
- Accesibilidad, navegación por teclado, lector de pantalla y responsive mobile-first.
- Idiomas es/en/pt-BR con formato de fechas, números y mensajes.

### Iteración 6 — Adquisiciones y desarrollo de colecciones

**Objetivo:** administrar el ciclo presupuestario desde sugerencia hasta recepción.

- Sugerencias de miembros y personal.
- Listas de selección, evaluación y aprobación.
- Proveedores, contratos, presupuestos, fondos y ejercicios fiscales.
- Órdenes de compra, líneas, impuestos, descuentos y recepción parcial.
- Facturas, pagos y conciliación.
- Catalogación al recibir y generación de ejemplares.
- Trazabilidad de gasto y alertas de presupuesto.

### Iteración 7 — Publicaciones seriadas

**Objetivo:** controlar revistas, periódicos y colecciones continuas.

- Títulos seriados, proveedores y suscripciones.
- Patrón de predicción de fascículos.
- Recepción, reclamación de números faltantes y kardex.
- Renovaciones contractuales y calendario.
- Acceso público y enlazado desde OPAC.

### Iteración 8 — Biblioteca digital y derechos

**Objetivo:** integrar recursos electrónicos con control de acceso.

- Recursos digitales, archivos, enlaces y metadatos.
- Almacenamiento seguro, presigned URLs y antivirus para cargas.
- Restricciones por tenant, biblioteca, membresía, licencia y fecha.
- DRM/embargo cuando aplique; nunca exponer URLs privadas.
- Visualización/descarga auditada y métricas de uso.
- Integración con repositorios externos y resolvers OpenURL.

### Iteración 9 — Inventario, conservación y descarte

**Objetivo:** mantener la colección físicamente confiable.

- Conteos por sucursal, colección, estantería y rango de códigos.
- Escaneo móvil y modo offline con cola de sincronización.
- Hallado, faltante, duplicado, dañado, reparación y descarte.
- Transferencias internas y reubicaciones.
- Actas de descarte, motivos, aprobaciones y auditoría.
- Comparación entre inventario esperado y observado.

### Iteración 10 — Reportes, analítica y operación

**Objetivo:** transformar datos operativos en decisiones.

- Dashboard de circulación, catálogo, miembros, adquisiciones e inventario.
- Reportes guardados, filtros, exportación CSV/PDF y programación.
- KPIs: circulación, rotación, overdue, reservas, tiempos de atención, crecimiento, uso digital y presupuesto.
- Cohortes y tendencias por sucursal, material, categoría y periodo.
- PII protegida y vistas agregadas para roles restringidos.
- Data warehouse/analytics separado si el volumen lo requiere.

### Iteración 11 — Integraciones e interoperabilidad

**Objetivo:** conectar BiblioNexus con el ecosistema bibliotecario.

- SIP2 para dispositivos/autoservicio.
- Z39.50/SRU para búsqueda e importación bibliográfica.
- OAI-PMH para exposición de metadatos.
- SSO institucional/SAML u OIDC cuando se priorice.
- Email/SMS/push para vencimientos, holds, multas y eventos.
- Webhooks, API keys rotables, rate limiting y scopes.
- Importación/exportación programada y reintentos idempotentes.
- Monitor de salud, logs de integración y dead-letter queue.

### Iteración 12 — Hardening, escala y lanzamiento

**Objetivo:** preparar producción multi-tenant.

- Revisión de threat model, OWASP, CSRF, SSRF, XSS, SQL injection y subida de archivos.
- Pruebas de aislamiento tenant/sucursal y autorización negativa.
- Backups, restore probado, retención, disaster recovery y RPO/RTO.
- Observabilidad: errores, trazas, métricas, auditoría y alertas.
- Performance: índices, caché, búsqueda dedicada, colas y límites.
- Pruebas de carga para OPAC y mostrador.
- Runbooks, soporte, feature flags, migraciones reversibles y plan de rollback.
- Beta controlada, capacitación, migración de datos y checklist de go-live.

## 4. Categorías funcionales completas

1. Plataforma y multi-tenancy
2. Identidad, usuarios, roles y permisos
3. Bibliotecas, redes, sucursales y políticas
4. Catálogo bibliográfico
5. MARC21, Dublin Core y autoridades
6. Ediciones, holdings, ejemplares e inventario
7. Circulación: loans, returns, renewals, holds, transfers
8. Miembros, categorías, tarjetas y privacidad
9. Multas, pagos, ajustes y recibos
10. OPAC, descubrimiento y autoservicio
11. Adquisiciones, proveedores y presupuestos
12. Publicaciones seriadas
13. Biblioteca digital y licencias
14. Conservación, reparaciones y descarte
15. Reportes y analítica
16. Notificaciones y plantillas
17. Integraciones e interoperabilidad
18. Auditoría, seguridad y cumplimiento
19. Configuración, localización y accesibilidad
20. Operación offline, sincronización y observabilidad

## 5. Reglas de arquitectura de datos

- Toda entidad de negocio debe tener `tenantId` directo o ser alcanzable sin ambigüedad desde una entidad tenant.
- Toda query administrativa debe aplicar tenant scope y, cuando corresponda, library/branch scope.
- Las acciones de circulación deben ser idempotentes mediante `requestId`/idempotency key.
- No actualizar `Item`, `Loan`, `Hold`, multas o transferencias fuera de un servicio transaccional.
- Fechas almacenadas en UTC; presentación con locale y zona horaria de la biblioteca.
- Los estados deben modelarse como enums y eventos históricos, no sobrescribir la trazabilidad.
- PII y secretos nunca deben aparecer en logs, exportaciones no autorizadas o mensajes de error.
- El frontend consume casos de uso/repositories; no debe conocer SQL ni Prisma directamente.

## 6. Calidad y definición de terminado

Cada módulo está terminado cuando cumple:

- UI premium, responsive y accesible.
- Loading, empty, error, denied, offline y synced states.
- Validación de entrada en cliente y servidor.
- Autorización server-side y auditoría.
- Tests unitarios de reglas de dominio.
- Tests de integración de repositorios/transacciones.
- Smoke/e2e de las rutas principales.
- Estados y errores traducidos en es/en/pt-BR.
- Métricas y logs útiles sin filtrar PII.
- Documentación de operación y migración.
- Build, typecheck y lint verdes.

## 7. Orden recomendado de ejecución inmediata

1. Configurar `BETTER_AUTH_SECRET` y completar Better Auth.
2. Reemplazar datos demo de circulación por servicios Prisma transaccionales.
3. Completar seed y migración de Neon.
4. Implementar permisos server-side y pruebas de aislamiento.
5. Conectar catálogo, ejemplares y miembros a repositorios reales.
6. Añadir notificaciones y auditoría operacional.
7. Completar OPAC con disponibilidad real.
8. Continuar con adquisiciones, inventario y reportes.

## 8. Estado de ejecución — Iteración actual

- **Avance estimado del roadmap:** 31% (actualizado en esta iteración).
- **Completado:** migración Prisma reproducible `20260917164555_foundation` aplicada en Neon; seed demo ejecutado correctamente; servicio transaccional inicial para checkout, return y renew; límites de autorización tenant/library/branch y roles definidos.
- **Siguiente foco:** sustituir el tenant demo por resolución de sesión real, aplicar scopes en cada repository, integrar Better Auth cuando exista `BETTER_AUTH_SECRET`, y añadir pruebas de aislamiento e idempotencia.
- **Criterio de salida:** ninguna operación de circulación podrá ejecutarse sin contexto autorizado, tenant scope, transacción, auditoría y request idempotente.

## 8. Riesgos ejecutivos

- **Auth retrasada:** impide validar seguridad y multiusuario; es el primer bloqueo.
- **Prisma sin migración/seed estable:** dificulta pruebas reproducibles y onboarding.
- **Circulación sin transacciones:** riesgo de doble préstamo, inventario inconsistente y pérdida de trazabilidad.
- **RBAC solo visual:** riesgo de exposición o modificación no autorizada.
- **Datos demo mezclados con producción:** dificulta medir calidad y puede inducir decisiones incorrectas.
- **Integraciones prematuras:** deben entrar después de estabilizar dominio, eventos y observabilidad.
- **Offline mal diseñado:** puede producir conflictos; requiere idempotencia, versionado y resolución explícita.

Este roadmap es la guía de referencia para pasar de la experiencia premium actual a una plataforma ILS operativa, segura, interoperable y preparada para múltiples bibliotecas y sucursales.
