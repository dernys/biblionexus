'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth-client'

export function AuthForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const result = await signIn.email({ email, password })
    setPending(false)
    if (result.error) {
      setError('Unable to sign in with those credentials.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <label className="flex flex-col gap-2 text-sm font-medium">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-3 font-normal outline-none ring-primary focus:ring-2" /></label>
      <label className="flex flex-col gap-2 text-sm font-medium">Password<input required minLength={8} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-3 font-normal outline-none ring-primary focus:ring-2" /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button disabled={pending} className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}
