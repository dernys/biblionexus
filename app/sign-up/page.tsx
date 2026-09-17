import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Library } from 'lucide-react'
import { auth } from '@/lib/auth'
import { AuthForm } from '@/components/auth-form'

export default async function SignUpPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) redirect('/dashboard')

  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Library className="size-5" /></span>
          <div><p className="font-semibold">BiblioNexus</p><p className="text-xs text-muted-foreground">Create your account</p></div>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Join BiblioNexus</h1>
        <p className="mb-6 mt-2 text-sm text-muted-foreground">Create an account to manage your library access.</p>
        <AuthForm mode="sign-up" />
      </div>
    </main>
  )
}

