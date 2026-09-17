'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { signIn, signUp } from '@/lib/auth-client'

export function AuthForm({ mode = 'sign-in' }: { mode?: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const result = mode === 'sign-up'
      ? await signUp.email({ name, email, password })
      : await signIn.email({ email, password })
    setPending(false)
    if (result.error) {
      setError(mode === 'sign-up' ? 'Unable to create the account.' : 'Unable to sign in with those credentials.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm">
      {mode === 'sign-up' && <label className="flex flex-col gap-2 text-sm font-medium">Name<input required type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-3 font-normal outline-none ring-primary focus:ring-2" /></label>}
      <label className="flex flex-col gap-2 text-sm font-medium">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-3 font-normal outline-none ring-primary focus:ring-2" /></label>
      <label className="flex flex-col gap-2 text-sm font-medium">Password<div className="relative"><input required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-3 pr-20 font-normal outline-none ring-primary focus:ring-2" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute inset-y-0 right-2 my-auto grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button disabled={pending} className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}
