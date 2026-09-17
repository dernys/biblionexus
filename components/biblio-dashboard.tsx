'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  BookMarked,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Command,
  Database,
  FilePlus2,
  LayoutDashboard,
  Library,
  Menu,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Tags,
  Users,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navGroups = [
  { label: 'Workspace', items: [['Overview', LayoutDashboard], ['Command Center', Sparkles]] },
  { label: 'Circulation', items: [['Loans', BookOpen], ['Returns', ArrowDownLeft], ['Renewals', RefreshCw], ['Holds', BookMarked, '12'], ['Transfers', ArrowUpRight]] },
  { label: 'Collection', items: [['Catalog', Library], ['Bibliographic Records', Database], ['Items', Boxes], ['Authorities', Tags], ['Collections', Library], ['Inventory', Check]] },
  { label: 'People', items: [['Members', Users], ['Staff', ShieldCheck], ['Membership Categories', Users]] },
  { label: 'Intelligence', items: [['Analytics', BarChart3], ['Recommendations', Sparkles], ['AI Assistant', CircleHelp]] },
]

const books = [
  { title: 'Cien años de soledad', author: 'Gabriel García Márquez', cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=160&h=220&fit=crop', tone: 'book-cover-ink' },
  { title: 'The Overstory', author: 'Richard Powers', cover: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=160&h=220&fit=crop', tone: 'book-cover-moss' },
  { title: 'The Dispossessed', author: 'Ursula K. Le Guin', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=160&h=220&fit=crop', tone: 'book-cover-coral' },
  { title: 'Pachinko', author: 'Min Jin Lee', cover: 'https://images.unsplash.com/photo-1511108690759-009324a90311?w=160&h=220&fit=crop', tone: 'book-cover-gold' },
]

function BookCover({ book, small = false }: { book: typeof books[number]; small?: boolean }) {
  return <div className={cn('relative shrink-0 overflow-hidden rounded-sm shadow-[0_8px_18px_-10px_rgba(0,0,0,.6)]', small ? 'h-12 w-9' : 'h-32 w-24')}><img src={book.cover} alt={`Cover of ${book.title}`} className="h-full w-full object-cover" /><div className={cn('absolute inset-0 mix-blend-multiply opacity-35', book.tone)} /><span className="absolute bottom-2 left-2 right-2 text-[9px] font-semibold leading-tight text-white drop-shadow-md">{book.title}</span></div>
}

const dashboardRoutes: Record<string, string> = {
  Overview: '/dashboard',
  'Command Center': '/dashboard',
  Loans: '/circulation/loans',
  Returns: '/circulation/returns',
  Renewals: '/circulation/renewals',
  Holds: '/circulation/holds',
  Transfers: '/circulation/transfers',
  Catalog: '/catalog',
  'Bibliographic Records': '/catalog',
  Items: '/catalog/inventory',
  Authorities: '/catalog/authorities',
  Collections: '/catalog/collections',
  Inventory: '/catalog/inventory',
  Members: '/members',
  Staff: '/admin/users',
  'Membership Categories': '/settings/member-categories',
  Analytics: '/analytics',
  Recommendations: '/analytics',
  'AI Assistant': '/analytics',
}

function Sidebar({ collapsed, onCollapse, mobileOpen, onClose }: { collapsed: boolean; onCollapse: () => void; mobileOpen: boolean; onClose: () => void }) {
  const router = useRouter()
  const pathname = usePathname()

  return <aside className={cn('shrink-0 border-r border-border bg-sidebar transition-[width] duration-300', mobileOpen ? 'fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col shadow-2xl' : 'hidden lg:flex lg:flex-col', collapsed ? 'lg:w-[76px]' : 'lg:w-[248px]')}>
    <div className="flex h-[72px] items-center gap-3 border-b border-border px-5">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground"><Library className="size-5" /></div>
      {!collapsed && <div className="min-w-0"><p className="truncate text-[15px] font-semibold tracking-tight">BiblioNexus</p><p className="truncate text-[10px] uppercase tracking-[.16em] text-muted-foreground">Library intelligence</p></div>}
      <button type="button" className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-sidebar-accent lg:hidden" onClick={onClose} aria-label="Close sidebar"><X className="size-5" /></button>
    </div>
    <nav className="flex-1 overflow-y-auto px-3 py-5">
      {navGroups.map((group) => <div className="mb-5" key={group.label}><p className={cn('mb-2 px-3 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground', collapsed && 'text-center text-[8px]')}>{collapsed ? group.label.slice(0, 1) : group.label}</p><div className="flex flex-col gap-1">{group.items.map(([label, Icon, badge]) => { const itemLabel = label as string; const href = dashboardRoutes[itemLabel] ?? '/dashboard'; const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`)); return <button key={itemLabel} type="button" title={collapsed ? itemLabel : undefined} onClick={() => router.push(href)} className={cn('group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground')}><Icon className="size-[17px] shrink-0" />{!collapsed && <><span className="truncate">{itemLabel}</span>{badge && <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">{badge as string}</span>}</>}</button> })}</div></div>)}
    </nav>
    <div className="border-t border-border p-3"><button onClick={onCollapse} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>{collapsed ? <PanelLeftOpen className="size-[17px]" /> : <><PanelLeftClose className="size-[17px]" /><span className="text-xs">Collapse menu</span></>}</button></div>
  </aside>
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const actions = ['Search “One Hundred Years of Solitude”', 'New loan', 'Register return', 'Create bibliographic record', 'Open inventory', 'Generate report']
  if (!open) return null
  return <div className="fixed inset-0 z-50 grid place-items-start bg-foreground/20 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}><div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl" onMouseDown={(e) => e.stopPropagation()}><div className="flex items-center gap-3 border-b border-border px-4 py-4"><Search className="size-5 text-muted-foreground" /><input autoFocus className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="What do you want to do?" /><kbd className="rounded border border-border bg-muted px-2 py-1 text-[10px] text-muted-foreground">ESC</kbd><button onClick={onClose} aria-label="Close command palette"><X className="size-4 text-muted-foreground" /></button></div><div className="p-2"><p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Recent & actions</p>{actions.map((action, index) => <button key={action} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm hover:bg-muted"><Command className={cn('size-4 text-muted-foreground', index === 0 && 'text-primary')} /><span>{action}</span>{index === 0 && <span className="ml-auto text-xs text-muted-foreground">⌘ ↵</span>}</button>)}</div></div></div>
}

export default function BiblioDashboard() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem('biblionexus-sidebar-collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  useEffect(() => {
    window.localStorage.setItem('biblionexus-sidebar-collapsed', String(collapsed))
  }, [collapsed])
  const [dark, setDark] = useState(false)
  const [selectedBook, setSelectedBook] = useState<number | null>(null)
  const [branch, setBranch] = useState('Central Library')
  const [notice, setNotice] = useState('')
  useEffect(() => { const listener = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(true) } if (e.key === 'Escape') setPaletteOpen(false) }; window.addEventListener('keydown', listener); return () => window.removeEventListener('keydown', listener) }, [])
  useEffect(() => { document.documentElement.classList.toggle('dark', dark) }, [dark])
  const activity = useMemo(() => [42, 58, 50, 73, 64, 88, 67, 79, 92, 70, 82, 96], [])
  return <div className="min-h-screen bg-background text-foreground"><div className="flex min-h-screen"><Sidebar collapsed={collapsed} onCollapse={() => setCollapsed((value) => !value)} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} /><div className="min-w-0 flex-1"><header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md sm:px-6"><button type="button" className="rounded-lg p-2 hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button><div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex"><span>Workspace</span><span>/</span><span className="font-medium text-foreground">Command Center</span></div><button onClick={() => setPaletteOpen(true)} className="ml-auto flex h-10 min-w-0 flex-1 items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted sm:ml-auto sm:max-w-[430px]"><Search className="size-4 shrink-0" /><span className="truncate">Search books, members, authors, ISBN...</span><kbd className="ml-auto hidden shrink-0 rounded border border-border bg-background px-2 py-1 text-[10px] sm:block">⌘ K</kbd></button><div className="flex items-center gap-1 sm:gap-2"><button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Notifications"><Bell className="size-[18px]" /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-amber-500" /></button><button className="hidden rounded-lg p-2 text-muted-foreground hover:bg-muted sm:block" aria-label="Help"><CircleHelp className="size-[18px]" /></button><button onClick={() => setDark(!dark)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Toggle theme">{dark ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}</button><button className="hidden items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-muted md:flex"><span className="size-2 rounded-full bg-emerald-500" />{branch}<ChevronDown className="size-3.5" /></button><div className="grid size-9 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">ML</div></div></header><main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8"><div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between"><div><p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[.18em] text-primary"><span className="size-1.5 rounded-full bg-primary" />Thursday, September 4, 2026</p><h1 className="text-balance text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Good afternoon, María</h1><p className="mt-2 text-[15px] text-muted-foreground">Your library at a glance. Here&apos;s what needs your attention today.</p></div><div className="flex items-center gap-2"><button onClick={() => setNotice('Report exported as CSV')} className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"><MoreHorizontal className="size-4" /> <span className="hidden sm:inline">More</span></button><button onClick={() => setNotice('New loan workspace opened')} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:opacity-90"><Plus className="size-4" /> New loan</button></div></div>{notice && <div className="mb-5 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"><span className="flex items-center gap-2"><Check className="size-4" />{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notice"><X className="size-4" /></button></div>}<section className="grid gap-4 xl:grid-cols-[1.15fr_1.85fr]"><div className="rounded-2xl bg-primary p-6 text-primary-foreground shadow-[0_16px_35px_-22px_var(--primary)] sm:p-8"><div className="flex items-start justify-between"><div><p className="text-sm text-primary-foreground/70">Collection at a glance</p><p className="mt-5 text-5xl font-semibold tracking-[-.07em]">12,482</p><p className="mt-1 text-sm text-primary-foreground/70">catalogued items</p></div><div className="rounded-xl bg-primary-foreground/10 p-3"><Library className="size-5" /></div></div><div className="mt-10 flex items-end justify-between gap-4 border-t border-primary-foreground/15 pt-4"><div><p className="text-xs text-primary-foreground/65">Collection growth</p><p className="mt-1 text-lg font-medium">+4.8% <span className="text-xs font-normal text-primary-foreground/65">this quarter</span></p></div><div className="flex h-10 items-end gap-1">{[35, 42, 30, 54, 46, 68, 59, 82, 75, 92].map((h, i) => <span key={i} className="w-1.5 rounded-t bg-primary-foreground/40" style={{ height: `${h}%` }} />)}</div></div></div><div className="grid grid-cols-2 gap-4 sm:grid-cols-4"><Metric label="Active loans" value="1,847" change="+12.4%" tone="positive" icon={BookOpen} /><Metric label="Overdue" value="126" change="-8.2%" tone="positive" icon={AlertTriangle} /><Metric label="Holds waiting" value="42" change="+3.1%" tone="warning" icon={BookMarked} /><Metric label="Transfers" value="8" change="Today" tone="neutral" icon={ArrowUpRight} /></div></section><section className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]"><div className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Today&apos;s circulation</p><div className="mt-2 flex items-baseline gap-2"><h2 className="text-2xl font-semibold tracking-tight">286</h2><span className="text-xs text-emerald-600">+18% vs yesterday</span></div></div><button className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Circulation options"><MoreHorizontal className="size-4" /></button></div><div className="mt-7 flex h-44 items-end gap-2 border-b border-border px-1 sm:gap-3">{activity.map((height, i) => <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="relative w-full max-w-7 rounded-t bg-primary/15 transition-all duration-300 group-hover:bg-primary" style={{ height: `${height}%` }}><div className="absolute inset-x-0 bottom-0 h-1/2 rounded-t bg-primary/50" /></div><span className="text-[10px] text-muted-foreground">{['8a', '', '10a', '', '12p', '', '2p', '', '4p', '', '6p', ''][i]}</span></div>)}</div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-primary" />Loans <strong className="font-medium text-foreground">142</strong></span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-primary/40" />Returns <strong className="font-medium text-foreground">98</strong></span><span className="flex items-center gap-2"><i className="size-2 rounded-full bg-primary/20" />Renewals <strong className="font-medium text-foreground">46</strong></span></div></div><div className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Attention required</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">4 items</h2></div><AlertTriangle className="size-5 text-amber-600" /></div><div className="mt-5 flex flex-col gap-1">{[['27 overdue items', 'Review overdue circulation.', 'amber'], ['8 reservations ready', 'Notify members before expiration.', 'blue'], ['4 serial issues expected', 'Check receiving queue.', 'slate'], ['3 records require review', 'Review metadata suggestions.', 'coral']].map(([title, desc, tone]) => <button key={title} onClick={() => setNotice(`${title} opened`)} className="flex items-center gap-3 rounded-xl p-2.5 text-left transition-colors hover:bg-muted"><span className={cn('size-2 shrink-0 rounded-full', tone === 'amber' && 'bg-amber-500', tone === 'blue' && 'bg-sky-500', tone === 'slate' && 'bg-slate-400', tone === 'coral' && 'bg-rose-400')} /><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{title}</span><span className="block truncate text-xs text-muted-foreground">{desc}</span></span><ArrowUpRight className="size-4 text-muted-foreground" /></button>)}</div></div></section><section className="mt-4 rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Quick actions</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Keep the day moving</h2></div><button onClick={() => setNotice('All actions available in command palette')} className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">View all actions <ArrowUpRight className="size-4" /></button></div><div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{[['New loan', Plus], ['Return', ArrowDownLeft], ['New member', Users], ['Catalog item', FilePlus2], ['New hold', BookMarked], ['Inventory', Boxes], ['Import MARC', Database]].map(([label, Icon], i) => <button key={label as string} onClick={() => setNotice(`${label} workspace opened`)} className={cn('flex min-h-20 flex-col items-start justify-between rounded-xl border px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm', i === 0 ? 'border-primary/30 bg-primary/5' : 'border-border bg-background')}><Icon className="size-[18px] text-primary" /><span className="text-xs font-medium">{label as string}</span></button>)}</div></section><section className="mt-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]"><div className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Collection pulse</p><h2 className="mt-2 text-xl font-semibold tracking-tight">What readers are reaching for</h2></div><button className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Collection options"><MoreHorizontal className="size-4" /></button></div><div className="mt-6 flex gap-4 overflow-x-auto pb-2">{books.map((book, index) => <button onClick={() => setSelectedBook(index)} className="group min-w-[135px] text-left" key={book.title}><div className="flex items-end gap-3"><BookCover book={book} /><span className="mb-1 text-xs font-medium text-muted-foreground">0{index + 1}</span></div><p className="mt-3 truncate text-sm font-medium group-hover:text-primary">{book.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{book.author}</p></button>)}</div></div><div className="rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Recent activity</p><h2 className="mt-2 text-xl font-semibold tracking-tight">Just now</h2></div><CalendarDays className="size-5 text-muted-foreground" /></div><div className="mt-5 flex flex-col gap-4">{[['María López', 'updated a record', 'Cien años de soledad', '09:42'], ['Andrés Torres', 'returned', 'The Overstory', '09:38'], ['System', 'synced 24 items', 'North Branch', '09:31']].map(([name, action, subject, time]) => <div className="flex gap-3" key={time}><div className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold">{name === 'System' ? <RefreshCw className="size-3.5" /> : name.split(' ').map((n) => n[0]).join('')}</div><p className="min-w-0 flex-1 text-xs leading-relaxed"><strong className="font-medium">{name}</strong> <span className="text-muted-foreground">{action}</span><br /><span className="truncate text-foreground/80">{subject}</span></p><time className="text-[10px] text-muted-foreground">{time}</time></div>)}</div></div></section></main></div></div>{selectedBook !== null && <div className="fixed inset-0 z-40 bg-foreground/15" onClick={() => setSelectedBook(null)}><aside onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-border bg-card p-6 shadow-2xl sm:p-8"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">Book record</p><button onClick={() => setSelectedBook(null)} className="rounded-lg p-2 hover:bg-muted" aria-label="Close book record"><X className="size-5" /></button></div><div className="mt-8 flex gap-5"><BookCover book={books[selectedBook]} /><div><h2 className="text-2xl font-semibold leading-tight tracking-tight">{books[selectedBook].title}</h2><p className="mt-2 text-sm text-muted-foreground">{books[selectedBook].author}</p><div className="mt-5 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400"><span className="size-2 rounded-full bg-emerald-500" />Available — 3 copies</div></div></div><div className="mt-8 border-t border-border pt-6"><dl className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm"><div><dt className="text-xs text-muted-foreground">Publisher</dt><dd className="mt-1">Editorial Planeta</dd></div><div><dt className="text-xs text-muted-foreground">Year</dt><dd className="mt-1">1967</dd></div><div><dt className="text-xs text-muted-foreground">ISBN</dt><dd className="mt-1">978-0307474728</dd></div><div><dt className="text-xs text-muted-foreground">Language</dt><dd className="mt-1">Spanish</dd></div></dl></div><div className="mt-auto flex gap-2"><button onClick={() => setNotice('Reserve request created')} className="flex-1 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">Reserve</button><button onClick={() => setNotice('Full record opened')} className="rounded-lg border border-border px-4 py-3 text-sm font-medium hover:bg-muted">View record</button></div></aside></div>}<CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} /></div>
}

function Metric({ label, value, change, tone, icon: Icon }: { label: string; value: string; change: string; tone: string; icon: typeof BookOpen }) {
  return <div className="flex min-h-[148px] flex-col justify-between rounded-2xl border border-border bg-card p-4"><div className="flex items-center justify-between"><p className="text-xs leading-4 text-muted-foreground">{label}</p><Icon className="size-4 text-muted-foreground" /></div><div><p className="text-3xl font-semibold tracking-[-.06em]">{value}</p><p className={cn('mt-1 text-xs', tone === 'warning' ? 'text-amber-600' : tone === 'positive' ? 'text-emerald-600' : 'text-muted-foreground')}>{change}</p></div></div>
}

export { BiblioDashboard }
