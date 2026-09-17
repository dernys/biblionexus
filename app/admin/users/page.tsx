import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AppShell, PageHeader } from '@/components/app-shell'
import { listAdminUsers, listRolesAndPermissions } from '@/app/actions/admin-users'
import { UsersTable } from '@/components/admin-users-table'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect('/sign-in')
  const [users, roles] = await Promise.all([listAdminUsers(), listRolesAndPermissions()])
  return <AppShell><PageHeader title="Users" description="Manage staff identities, status, roles, and operational scopes." /><UsersTable initialUsers={users} roles={roles} /></AppShell>
}
