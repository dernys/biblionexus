export type LogContext = Record<string, string | number | boolean | null | undefined>

export function logEvent(event: string, context: LogContext = {}) {
  const payload = { timestamp: new Date().toISOString(), event, ...context }
  if (process.env.NODE_ENV === 'production') {
    console.info(JSON.stringify(payload))
    return
  }
  console.info(`[biblionexus] ${event}`, context)
}

export function assertNonEmpty(value: string, field: string) {
  const normalized = value.trim()
  if (!normalized) throw new Error(`${field} is required`)
  return normalized
}

export function parsePagination(input: { page?: string | number; pageSize?: string | number }) {
  const page = Math.max(1, Number(input.page ?? 1) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(input.pageSize ?? 25) || 25))
  return { page, pageSize, skip: (page - 1) * pageSize }
}

export function toSafeSearchQuery(value: string | undefined) {
  return value?.trim().slice(0, 160) ?? ''
}

export function getRequestId(headers: Headers) {
  return headers.get('x-request-id') ?? crypto.randomUUID()
}

export const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

export function createAuditEvent(input: { action: string; actorId?: string; tenantId?: string; entity?: string; entityId?: string }) {
  return { ...input, occurredAt: new Date().toISOString() }
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

export type AuditAction =
  | 'catalog.record.created'
  | 'catalog.record.updated'
  | 'circulation.loan.created'
  | 'circulation.item.returned'
  | 'circulation.loan.renewed'
  | 'circulation.hold.created'
  | 'circulation.transfer.created'
  | 'access.denied'

export function getSyncLabel(state: SyncState) {
  return { idle: 'Ready', syncing: 'Syncing', synced: 'Synced', offline: 'Offline', error: 'Sync error' }[state]
}

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL
  if (!url) throw new Error('DATABASE_URL is not configured')
  return url
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL ?? process.env.POSTGRES_PRISMA_URL)
}

export function formatError(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected application error'
}

export function withRequestId(requestId: string) {
  return { 'x-request-id': requestId }
}

export function normalizeLocale(locale: string | undefined) {
  return locale === 'pt-BR' || locale === 'en' ? locale : 'es'
}

export function safeJson(value: unknown) {
  return JSON.stringify(value, (_, nested) => (typeof nested === 'bigint' ? nested.toString() : nested))
}

export function isValidBarcode(value: string) {
  return /^[A-Za-z0-9-]{4,64}$/.test(value.trim())
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function clampLimit(value: number, fallback = 50) {
  return Math.min(100, Math.max(1, Number.isFinite(value) ? value : fallback))
}

export const PLATFORM_VERSION = '0.2.0-foundation'

export default { PLATFORM_VERSION, securityHeaders }
