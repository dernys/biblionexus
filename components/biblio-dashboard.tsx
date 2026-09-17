'use client'

import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Bell, BookOpen, Boxes, ChevronRight, Globe2, Library, Menu, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { normalizeLocale, type Locale } from '@/lib/biblio-data'
import type { DashboardData } from '@/lib/services/dashboard'

const translations = {
  en: { overview: 'Overview', loans: 'Loans', returns: 'Returns', catalog: 'Catalog', inventory: 'Inventory', members: 'Members', staff: 'Staff', commandCenter: 'Command Center', operationalOverview: 'Operational overview', liveActivity: 'Live activity from your authorized library scope.', workspace: 'Workspace', search: 'Search books, members, authors...', activeLoans: 'Active loans', overdueItems: 'Overdue items', activeMembers: 'Active members', catalogRecords: 'Catalog records', currentCheckouts: 'Current checkouts', needsAttention: 'Needs attention', authorizedScope: 'In your authorized scope', bibliographicRecords: 'Bibliographic records', recentActivity: 'Recent activity', viewAll: 'View all', language: 'Language', collapse: 'Collapse menu', expand: 'Expand sidebar' },
  es: { overview: 'Resumen', loans: 'Préstamos', returns: 'Devoluciones', catalog: 'Catálogo', inventory: 'Inventario', members: 'Miembros', staff: 'Personal', commandCenter: 'Centro de control', operationalOverview: 'Resumen operativo', liveActivity: 'Actividad en vivo de tu ámbito autorizado.', workspace: 'Espacio de trabajo', search: 'Buscar libros, miembros, autores...', activeLoans: 'Préstamos activos', overdueItems: 'Elementos vencidos', activeMembers: 'Miembros activos', catalogRecords: 'Registros bibliográficos', currentCheckouts: 'Préstamos actuales', needsAttention: 'Requiere atención', authorizedScope: 'En tu ámbito autorizado', bibliographicRecords: 'Registros bibliográficos', recentActivity: 'Actividad reciente', viewAll: 'Ver todo', language: 'Idioma', collapse: 'Contraer menú', expand: 'Expandir barra lateral' },
} as const

const navigation = [
  { label: 'Overview', href: '/dashboard', icon: BarChart3 },
  { label: 'Loans', href: '/circulation/loans', icon: BookOpen },
  { label: 'Returns', href: '/circulation/returns', icon: ChevronRight },
  { label: 'Catalog', href: '/catalog', icon: Library },
  { label: 'Inventory', href: '/catalog/inventory', icon: Boxes },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Staff', href: '/admin/users', icon: ShieldCheck },
]

function Sidebar({ collapsed, mobileOpen, onCollapse, onClose, locale, onLocaleChange }: { collapsed: boolean; mobileOpen: boolean; onCollapse: () => void; onClose: () => void; locale: Locale; onLocaleChange: (locale: Locale) => void }) {
  const router = useRouter()
  const copy = translations[locale === 'es' ? 'es' : 'en']
  const pathname = usePathname()
  return <aside className={cn('shrink-0 border-r border-border bg-sidebar transition-[width] duration-200', mobileOpen ? 'fixed inset-y-0 left-0 z-40 flex w-64 flex-col shadow-xl' : 'hidden lg:flex lg:flex-col', collapsed ? 'lg:w-20' : 'lg:w-64')}>
    <div className="flex h-16 items-center gap-3 border-b border-border px-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Library /></div>
      {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">BiblioNexus</p><p className="truncate text-[10px] uppercase tracking-[.16em] text-muted-foreground">Library intelligence</p></div>}
      <button type="button" className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent lg:hidden" onClick={onClose} aria-label="Close sidebar"><X /></button>
    </div>
    <nav className="flex-1 overflow-y-auto p-3" aria-label="Primary navigation"><p className={cn('mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground', collapsed && 'sr-only')}>{locale === 'es' ? 'Navegación' : 'Navigation'}</p><div className="flex flex-col gap-1">{navigation.map(({ label, href, icon: Icon }) => { const active = pathname === href; const translatedLabel = copy[label.toLowerCase() as keyof typeof copy] ?? label; return <button key={href} type="button" title={collapsed ? label : undefined} onClick={() => { router.push(href); onClose() }} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground')}><Icon data-icon="inline-start" />{!collapsed && <span>{translatedLabel}</span>}</button> })}</div></nav>
    <div className="flex flex-col gap-2 border-t border-border p-3"><div className={cn('flex items-center gap-2 rounded-xl bg-sidebar-accent/60 px-3 py-2.5', collapsed && 'justify-center px-2')}><Globe2 className="size-4 shrink-0 text-sidebar-primary" /><label className={cn('min-w-0 flex-1 text-xs font-medium text-sidebar-foreground', collapsed && 'sr-only')} htmlFor="sidebar-language">{copy.language}</label><select id="sidebar-language" value={locale} onChange={(event) => onLocaleChange(normalizeLocale(event.target.value))} aria-label={copy.language} className={cn('min-w-0 rounded-md border-0 bg-transparent px-1 py-1 text-xs font-semibold text-sidebar-foreground outline-none focus:ring-2 focus:ring-sidebar-ring', collapsed && 'sr-only')}><option value="en">EN</option><option value="es">ES</option></select></div><button type="button" onClick={onCollapse} className={cn('flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', collapsed && 'justify-center px-2')} aria-label={collapsed ? copy.expand : copy.collapse}>{collapsed ? <PanelLeftOpen /> : <><PanelLeftClose /><span>{copy.collapse}</span></>}</button></div>
  </aside>
}

export function BiblioDashboard({ data }: { data: DashboardData }) {
  const [locale, setLocale] = useState<Locale>('en')
  const [collapsed, setCollapsed] = useState(false)
  const copy = translations[locale === 'es' ? 'es' : 'en']

  useEffect(() => {
    const savedLocale = window.localStorage.getItem('biblionexus-locale')
    if (savedLocale) setLocale(normalizeLocale(savedLocale))
  }, [])

  useEffect(() => {
    window.localStorage.setItem('biblionexus-locale', locale)
  }, [locale])
  const [mobileOpen, setMobileOpen] = useState(false)
  const { metrics, recentActivity } = data
  const cards = [
    [copy.activeLoans, metrics.activeLoans.toLocaleString(), BookOpen, copy.currentCheckouts],
    [copy.overdueItems, metrics.overdueLoans.toLocaleString(), Bell, copy.needsAttention],
    [copy.activeMembers, metrics.members.toLocaleString(), Users, copy.authorizedScope],
    [copy.catalogRecords, metrics.records.toLocaleString(), Library, copy.bibliographicRecords],
  ] as const
  return <div className="min-h-screen bg-background text-foreground"><div className="flex min-h-screen"><Sidebar collapsed={collapsed} mobileOpen={mobileOpen} locale={locale} onLocaleChange={setLocale} onCollapse={() => setCollapsed((value) => !value)} onClose={() => setMobileOpen(false)} /><main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6"><button type="button" className="rounded-lg p-2 hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></button><div className="hidden text-sm text-muted-foreground sm:block">{copy.workspace} <span className="mx-2">/</span><span className="font-medium text-foreground">{copy.overview}</span></div><div className="ml-auto flex items-center gap-2"><div className="flex items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-1.5 shadow-sm"><Globe2 className="size-4 text-primary" /><label className="sr-only" htmlFor="dashboard-language">{copy.language}</label><select id="dashboard-language" value={locale} onChange={(event) => setLocale(normalizeLocale(event.target.value))} className="cursor-pointer border-0 bg-transparent px-0.5 py-0.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary"><option value="en">English</option><option value="es">Español</option></select></div><div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground sm:flex"><Search /><span className="hidden md:inline">{copy.search}</span></div></div></header><div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><div className="mb-8"><p className="text-sm font-medium text-primary">{copy.commandCenter}</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{copy.operationalOverview}</h1><p className="mt-2 text-muted-foreground">{copy.liveActivity}</p></div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label={copy.operationalOverview}>{cards.map(([label, value, Icon, description]) => <article key={label} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon className="text-muted-foreground" /></div><p className="mt-6 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></article>)}</section><div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="font-semibold">{locale === 'es' ? 'Resumen de colección' : 'Collection snapshot'}</h2><p className="mt-1 text-sm text-muted-foreground">Inventory and holds in scope</p></div></div><div className="grid gap-4 p-5 sm:grid-cols-2"><div className="rounded-xl bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Items</p><p className="mt-2 text-2xl font-semibold">{metrics.items.toLocaleString()}</p></div><div className="rounded-xl bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Open holds</p><p className="mt-2 text-2xl font-semibold">{metrics.holds.toLocaleString()}</p></div></div></section><section className="rounded-2xl border border-border bg-card"><div className="border-b border-border p-5"><h2 className="font-semibold">{copy.recentActivity}</h2><p className="mt-1 text-sm text-muted-foreground">Audited events from your tenant</p></div><div className="divide-y divide-border">{recentActivity.length ? recentActivity.map((event) => <div key={event.id} className="flex items-start justify-between gap-4 p-4"><div><p className="text-sm font-medium">{event.action}</p><p className="text-xs text-muted-foreground">{event.entity} · {event.result}</p></div><time className="shrink-0 text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>) : <p className="p-5 text-sm text-muted-foreground">No audited activity yet.</p>}</div></section></div></div></main></div></div>
}
