'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowDownToLine, ArrowRightLeft, BadgeCheck, BookOpen, Check, ChevronDown, CircleAlert, Clock3, Filter, Library, Plus, RefreshCw, Search, ShieldCheck, Sparkles, UserRound, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { key: 'loans', label: 'Loans', href: '/circulation/loans', eyebrow: 'Active circulation', description: 'Keep every checkout visible, accountable, and easy to resolve.' },
  { key: 'returns', label: 'Returns', href: '/circulation/returns', eyebrow: 'Desk workflow', description: 'Process returns, inspections, and next-step routing without losing context.' },
  { key: 'renewals', label: 'Renewals', href: '/circulation/renewals', eyebrow: 'Retention queue', description: 'Extend eligible loans while protecting high-demand titles and policies.' },
  { key: 'holds', label: 'Holds', href: '/circulation/holds', eyebrow: 'Fulfillment', description: 'Prioritize requests, trigger notifications, and keep pickup windows moving.' },
  { key: 'transfers', label: 'Transfers', href: '/circulation/transfers', eyebrow: 'Inter-branch logistics', description: 'Coordinate item movement across the network with a clear chain of custody.' },
] as const

type TabKey = (typeof tabs)[number]['key']
const records = {
  loans: [
    ['The Overstory', 'Sofia Alvarez', 'BK-00842', 'Due today', 'Central desk'],
    ['Pachinko', 'Mateo Silva', 'BK-01218', 'Due in 2 days', 'Central desk'],
    ['Invisible Cities', 'Ana Costa', 'BK-01007', 'Overdue 3 days', 'North branch'],
    ['Braiding Sweetgrass', 'Noah Williams', 'BK-01981', 'Due in 6 days', 'Central desk'],
  ],
  returns: [
    ['Cien años de soledad', 'Elena Rossi', 'BK-00428', 'Ready to shelve', 'Central desk'],
    ['The Dispossessed', 'Jules Martin', 'BK-01505', 'Inspection needed', 'North branch'],
    ['The Left Hand of Darkness', 'Priya Shah', 'BK-00277', 'Ready to shelve', 'Central desk'],
  ],
  renewals: [
    ['The Overstory', 'Sofia Alvarez', 'BK-00842', 'Eligible', '2 renewals left'],
    ['Pachinko', 'Mateo Silva', 'BK-01218', 'Eligible', '1 renewal left'],
    ['Dune', 'Liam Okafor', 'BK-03112', 'Blocked by hold', '3 waiting'],
  ],
  holds: [
    ['The Overstory', 'Nora Patel', 'HLD-2038', 'Ready for pickup', 'Expires Mar 18'],
    ['Pachinko', 'Sofia Alvarez', 'HLD-2037', 'In transit', 'North branch'],
    ['Cien años de soledad', 'Milo Grant', 'HLD-2036', 'Queued', 'Position 2'],
  ],
  transfers: [
    ['Pachinko', 'Central → North', 'TRF-0518', 'In transit', 'Due tomorrow'],
    ['Dune', 'North → Central', 'TRF-0517', 'Awaiting pickup', 'Since Mar 14'],
    ['The Overstory', 'Central → East', 'TRF-0516', 'Received', 'Mar 15, 14:20'],
  ],
} satisfies Record<TabKey, string[][]>

const metrics: Record<TabKey, { label: string; value: string; note: string }[]> = {
  loans: [{ label: 'Active loans', value: '1,284', note: '+8.4% this month' }, { label: 'Due today', value: '86', note: '12 high priority' }, { label: 'Overdue', value: '37', note: '4 need outreach' }],
  returns: [{ label: 'Awaiting processing', value: '24', note: '8 at Central desk' }, { label: 'Returned today', value: '118', note: '+14 from yesterday' }, { label: 'Inspection flags', value: '6', note: '2 damage reports' }],
  renewals: [{ label: 'Renewal requests', value: '42', note: '31 eligible now' }, { label: 'Auto-renewed', value: '129', note: 'This week' }, { label: 'Blocked by holds', value: '11', note: 'Needs review' }],
  holds: [{ label: 'Open holds', value: '214', note: 'Across 3 branches' }, { label: 'Ready for pickup', value: '28', note: '7 expire today' }, { label: 'Avg. wait', value: '2.4d', note: '-0.6d this month' }],
  transfers: [{ label: 'In transit', value: '18', note: '6 arriving today' }, { label: 'Awaiting pickup', value: '9', note: 'Across 3 branches' }, { label: 'Avg. transit', value: '1.8d', note: '-0.3d this month' }],
}

function Status({ value }: { value: string }) {
  const positive = ['Eligible', 'Ready to shelve', 'Received', 'Ready for pickup'].includes(value)
  const warning = ['Overdue 3 days', 'Blocked by hold', 'Inspection needed', 'Awaiting pickup'].includes(value)
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', positive && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300', warning && 'bg-amber-500/10 text-amber-700 dark:text-amber-300', !positive && !warning && 'bg-muted text-muted-foreground')}><span className={cn('size-1.5 rounded-full', positive ? 'bg-emerald-500' : warning ? 'bg-amber-500' : 'bg-muted-foreground')} />{value}</span>
}

export function CirculationWorkspace({ initialTab = 'loans', overview }: { initialTab?: TabKey; overview?: { records: string[][]; metrics: { label: string; value: string; note: string }[] } }) {
  const [tab, setTab] = useState<TabKey>(initialTab)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const liveRecords = tab === 'loans' && overview ? overview.records : records[tab]
  const rows = useMemo(() => liveRecords.filter((row) => row.join(' ').toLowerCase().includes(query.toLowerCase())), [liveRecords, query])
  const config = tabs.find((item) => item.key === tab)!

  const commit = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2800) }
  return <div className="space-y-7">
    <div className="flex flex-col gap-5 border-b border-border pb-6 xl:flex-row xl:items-end xl:justify-between">
      <div><div className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.18em] text-primary"><Library className="size-3.5" /> Operations / Circulation</div><h1 className="text-balance text-3xl font-semibold tracking-[-.05em] sm:text-4xl">Circulation desk</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">One calm workspace for every movement, promise, and exception in your library network.</p></div>
      <div className="flex items-center gap-2"><button onClick={() => commit('Offline queue synced just now')} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted"><RefreshCw className="size-4" /> Sync status</button><button onClick={() => commit(`New ${tab.slice(0, -1)} workflow opened`)} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Plus className="size-4" /> New transaction</button></div>
    </div>
    <div className="grid gap-2 rounded-2xl border border-border bg-muted/30 p-1.5 sm:grid-cols-5">{tabs.map((item) => <Link key={item.key} href={item.href} onClick={() => setTab(item.key)} className={cn('flex items-center justify-between rounded-xl px-3 py-3 text-left transition-colors', tab === item.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:bg-card/60')}><span className="flex items-center gap-2 text-sm font-medium"><span className={cn('grid size-7 place-items-center rounded-lg', tab === item.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{item.key === 'loans' ? <BookOpen className="size-4" /> : item.key === 'returns' ? <ArrowDownToLine className="size-4" /> : item.key === 'renewals' ? <RefreshCw className="size-4" /> : item.key === 'holds' ? <Clock3 className="size-4" /> : <ArrowRightLeft className="size-4" />}</span>{item.label}</span>{tab === item.key && <ChevronDown className="size-4" />}</Link>)}</div>
    <div className="grid gap-4 md:grid-cols-3">{(tab === 'loans' && overview ? overview.metrics : metrics[tab]).map((metric, index) => <div key={metric.label} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between"><p className="text-sm text-muted-foreground">{metric.label}</p><span className={cn('rounded-lg p-2', index === 2 ? 'bg-amber-500/10 text-amber-700' : 'bg-primary/10 text-primary')}>{index === 0 ? <Sparkles className="size-4" /> : index === 1 ? <Clock3 className="size-4" /> : <CircleAlert className="size-4" />}</span></div><p className="mt-4 text-3xl font-semibold tracking-[-.04em]">{metric.value}</p><p className="mt-1 text-xs text-muted-foreground">{metric.note}</p></div>)}</div>
    <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
      <section className="overflow-hidden rounded-2xl border border-border bg-card"><div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">{config.label} queue</p><p className="mt-1 text-xs text-muted-foreground">{config.description}</p></div><div className="flex gap-2"><label className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3"><Search className="size-4 text-muted-foreground" /><span className="sr-only">Search {config.label}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter queue" className="w-full bg-transparent py-2 text-sm outline-none" /></label><button className="rounded-lg border border-border p-2 text-muted-foreground hover:bg-muted" aria-label="Filter"><Filter className="size-4" /></button></div></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-muted/30 text-xs text-muted-foreground"><tr>{['Record', tab === 'transfers' ? 'Route' : tab === 'holds' ? 'Requestor' : 'Member', 'Reference', 'Status', 'Next step'].map((head) => <th className="px-4 py-3 font-medium" key={head}>{head}</th>)}<th className="px-4 py-3" /></tr></thead><tbody>{rows.map((row) => <tr key={row[2]} className="border-t border-border hover:bg-muted/20"><td className="px-4 py-4"><p className="font-medium">{row[0]}</p><p className="mt-1 text-xs text-muted-foreground">{tab === 'transfers' ? 'Collection movement' : 'Central Library'}</p></td><td className="px-4 py-4 text-muted-foreground">{row[1]}</td><td className="px-4 py-4 font-mono text-xs text-muted-foreground">{row[2]}</td><td className="px-4 py-4"><Status value={row[3]} /></td><td className="px-4 py-4 text-muted-foreground">{row[4]}</td><td className="px-4 py-4 text-right"><button onClick={() => setSelected(row[2])} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={`Open ${row[2]}`}><ChevronDown className="size-4 -rotate-90" /></button></td></tr>)}{rows.length === 0 && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">No transactions match this filter.</td></tr>}</tbody></table></div></section>
      <aside className="space-y-4"><div className="rounded-2xl border border-primary/20 bg-primary/5 p-5"><div className="flex items-center gap-2 text-primary"><ShieldCheck className="size-4" /><p className="text-xs font-semibold uppercase tracking-[.15em]">Desk guardrails</p></div><p className="mt-4 text-sm leading-6 text-foreground">Policy checks are active for branch, member status, holds, fines, and item condition.</p><button onClick={() => commit('Policy center opened')} className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">Review policies <ArrowRightLeft className="size-4" /></button></div><div className="rounded-2xl border border-border bg-card p-5"><p className="text-sm font-semibold">Fast lane</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Keyboard-ready actions for the service desk.</p><div className="mt-4 grid gap-2">{[['Scan member', UserRound], ['Scan item', BookOpen], ['Open holds', Clock3]].map(([label, Icon]) => <button key={label as string} onClick={() => commit(`${label} mode enabled`)} className="flex items-center justify-between rounded-xl border border-border px-3 py-3 text-left text-sm hover:bg-muted"><span className="flex items-center gap-2"><Icon className="size-4 text-primary" />{label as string}</span><span className="text-xs text-muted-foreground">⌘ ↵</span></button>)}</div></div></aside>
    </div>
    {selected && <div className="fixed inset-0 z-50 bg-foreground/20 p-4 backdrop-blur-sm" onMouseDown={() => setSelected(null)}><div className="ml-auto flex h-full max-w-md flex-col overflow-auto border border-border bg-card p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[.15em] text-primary">Transaction detail</p><h2 className="mt-2 text-xl font-semibold">{selected}</h2></div><button onClick={() => setSelected(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Close detail"><X className="size-5" /></button></div><div className="mt-8 space-y-4"><div className="rounded-xl bg-muted/40 p-4"><p className="text-xs text-muted-foreground">Current workflow</p><p className="mt-1 font-medium">{config.label} · {config.eyebrow}</p></div><div className="flex items-start gap-3"><BadgeCheck className="mt-0.5 size-5 text-emerald-600" /><div><p className="text-sm font-medium">Policy checks passed</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Member is active and this branch has the required permissions.</p></div></div><div className="flex items-start gap-3"><BookOpen className="mt-0.5 size-5 text-primary" /><div><p className="text-sm font-medium">Next step</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Review the record, confirm the staff action, and notify the member when required.</p></div></div></div><button onClick={() => { commit('Transaction updated'); setSelected(null) }} className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"><Check className="size-4" /> Confirm action</button></div></div>}
    {toast && <div role="status" className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-foreground px-4 py-3 text-sm text-background shadow-xl"><Check className="size-4 text-primary" />{toast}</div>}
  </div>
}

export type { TabKey }
