'use client'

import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, Bell, BookOpen, Boxes, ChevronRight, Library, Menu, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck, Users, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { DashboardData } from '@/lib/services/dashboard'

const navigation = [
  { label: 'Overview', href: '/dashboard', icon: BarChart3 },
  { label: 'Loans', href: '/circulation/loans', icon: BookOpen },
  { label: 'Returns', href: '/circulation/returns', icon: ChevronRight },
  { label: 'Catalog', href: '/catalog', icon: Library },
  { label: 'Inventory', href: '/catalog/inventory', icon: Boxes },
  { label: 'Members', href: '/members', icon: Users },
  { label: 'Staff', href: '/admin/users', icon: ShieldCheck },
]

function Sidebar({ collapsed, mobileOpen, onCollapse, onClose }: { collapsed: boolean; mobileOpen: boolean; onCollapse: () => void; onClose: () => void }) {
  const router = useRouter()
  const pathname = usePathname()
  return <aside className={cn('shrink-0 border-r border-border bg-sidebar transition-[width] duration-200', mobileOpen ? 'fixed inset-y-0 left-0 z-40 flex w-64 flex-col shadow-xl' : 'hidden lg:flex lg:flex-col', collapsed ? 'lg:w-20' : 'lg:w-64')}>
    <div className="flex h-16 items-center gap-3 border-b border-border px-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Library /></div>
      {!collapsed && <div className="min-w-0"><p className="truncate text-sm font-semibold">BiblioNexus</p><p className="truncate text-[10px] uppercase tracking-[.16em] text-muted-foreground">Library intelligence</p></div>}
      <button type="button" className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent lg:hidden" onClick={onClose} aria-label="Close sidebar"><X /></button>
    </div>
    <nav className="flex-1 p-3" aria-label="Primary navigation"><div className="flex flex-col gap-1">{navigation.map(({ label, href, icon: Icon }) => { const active = pathname === href; return <button key={href} type="button" title={collapsed ? label : undefined} onClick={() => { router.push(href); onClose() }} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground')}><Icon data-icon="inline-start" />{!collapsed && <span>{label}</span>}</button> })}</div></nav>
    <div className="border-t border-border p-3"><button type="button" onClick={onCollapse} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen /> : <><PanelLeftClose /><span>Collapse menu</span></>}</button></div>
  </aside>
}

export function BiblioDashboard({ data }: { data: DashboardData }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { metrics, recentActivity } = data
  const cards = [
    ['Active loans', metrics.activeLoans.toLocaleString(), BookOpen, 'Current checkouts'],
    ['Overdue items', metrics.overdueLoans.toLocaleString(), Bell, 'Needs attention'],
    ['Active members', metrics.members.toLocaleString(), Users, 'In your authorized scope'],
    ['Catalog records', metrics.records.toLocaleString(), Library, 'Bibliographic records'],
  ] as const
  return <div className="min-h-screen bg-background text-foreground"><div className="flex min-h-screen"><Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onCollapse={() => setCollapsed((value) => !value)} onClose={() => setMobileOpen(false)} /><main className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6"><button type="button" className="rounded-lg p-2 hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu /></button><div className="hidden text-sm text-muted-foreground sm:block">Workspace <span className="mx-2">/</span><span className="font-medium text-foreground">Overview</span></div><div className="ml-auto flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground"><Search /><span className="hidden md:inline">Search books, members, authors...</span></div></header><div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><div className="mb-8"><p className="text-sm font-medium text-primary">Command Center</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Operational overview</h1><p className="mt-2 text-muted-foreground">Live activity from your authorized library scope.</p></div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Operational metrics">{cards.map(([label, value, Icon, description]) => <article key={label} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">{label}</p><Icon className="text-muted-foreground" /></div><p className="mt-6 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-xs text-muted-foreground">{description}</p></article>)}</section><div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><section className="rounded-2xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="font-semibold">Collection snapshot</h2><p className="mt-1 text-sm text-muted-foreground">Inventory and holds in scope</p></div></div><div className="grid gap-4 p-5 sm:grid-cols-2"><div className="rounded-xl bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Items</p><p className="mt-2 text-2xl font-semibold">{metrics.items.toLocaleString()}</p></div><div className="rounded-xl bg-muted/50 p-4"><p className="text-sm text-muted-foreground">Open holds</p><p className="mt-2 text-2xl font-semibold">{metrics.holds.toLocaleString()}</p></div></div></section><section className="rounded-2xl border border-border bg-card"><div className="border-b border-border p-5"><h2 className="font-semibold">Recent activity</h2><p className="mt-1 text-sm text-muted-foreground">Audited events from your tenant</p></div><div className="divide-y divide-border">{recentActivity.length ? recentActivity.map((event) => <div key={event.id} className="flex items-start justify-between gap-4 p-4"><div><p className="text-sm font-medium">{event.action}</p><p className="text-xs text-muted-foreground">{event.entity} · {event.result}</p></div><time className="shrink-0 text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>) : <p className="p-5 text-sm text-muted-foreground">No audited activity yet.</p>}</div></section></div></div></main></div></div>
}
