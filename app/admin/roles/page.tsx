import { AppShell, PageHeader } from '@/components/app-shell'
import { listRolesAndPermissions } from '@/app/actions/admin-users'

export const dynamic = 'force-dynamic'

export default async function RolesPage() {
  const roles = await listRolesAndPermissions()
  return <AppShell><PageHeader title="Roles & permissions" description="Review the authorization model and its assigned capabilities." /><div className="grid gap-4 md:grid-cols-2">{roles.map((role) => <article key={role.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{role.name}</h2><p className="mt-1 text-sm text-muted-foreground">{role.description ?? 'No description provided.'}</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">{role._count.users} users</span></div><div className="mt-5 flex flex-wrap gap-2">{role.permissions.length ? role.permissions.map(({ permission }) => <span key={permission.id} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{permission.key}</span>) : <span className="text-sm text-muted-foreground">No permissions assigned</span>}</div></article>)}</div></AppShell>
}
