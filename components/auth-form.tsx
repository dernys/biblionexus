'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Globe2 } from 'lucide-react'
import { normalizeLocale, type Locale } from '@/lib/biblio-data'
import { signIn, signUp } from '@/lib/auth-client'

export function AuthForm({ mode = 'sign-in' }: { mode?: 'sign-in' | 'sign-up' }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [locale, setLocale] = useState<Locale>('en')
  const copy = locale === 'es' ? { name: 'Nombre', email: 'Correo electrónico', password: 'Contraseña', hide: 'Ocultar contraseña', show: 'Mostrar contraseña', submit: mode === 'sign-up' ? 'Crear cuenta' : 'Iniciar sesión', pending: mode === 'sign-up' ? 'Creando cuenta…' : 'Iniciando sesión…', error: mode === 'sign-up' ? 'No se pudo crear la cuenta.' : 'No se pudo iniciar sesión con esas credenciales.', language: 'Idioma' } : { name: 'Name', email: 'Email', password: 'Password', hide: 'Hide password', show: 'Show password', submit: mode === 'sign-up' ? 'Create account' : 'Sign in', pending: mode === 'sign-up' ? 'Creating account…' : 'Signing in…', error: mode === 'sign-up' ? 'Unable to create the account.' : 'Unable to sign in with those credentials.', language: 'Language' }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const result = mode === 'sign-up'
      ? await signUp.email({ name, email, password })
      : await signIn.email({ email, password })
    setPending(false)
    if (result.error) {
      setError(copy.error)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm"><div className="flex items-center justify-end gap-2 text-xs text-muted-foreground"><Globe2 className="size-4" /><label htmlFor="auth-language">{copy.language}</label><select id="auth-language" value={locale} onChange={(event) => setLocale(normalizeLocale(event.target.value))} className="rounded-md border border-border bg-background px-2 py-1 font-medium text-foreground"><option value="en">English</option><option value="es">Español</option></select></div>
      {mode === 'sign-up' && <label className="flex flex-col gap-2 text-sm font-medium">{copy.name}<input required type="text" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-3 font-normal outline-none ring-primary focus:ring-2" /></label>}
      <label className="flex flex-col gap-2 text-sm font-medium">{copy.email}<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-xl border border-border bg-background px-3 py-3 font-normal outline-none ring-primary focus:ring-2" /></label>
      <label className="flex flex-col gap-2 text-sm font-medium">{copy.password}<div className="relative"><input required minLength={8} type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-3 pr-20 font-normal outline-none ring-primary focus:ring-2" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-pressed={showPassword} aria-label={showPassword ? copy.hide : copy.show} className="absolute inset-y-0 right-2 my-auto grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button disabled={pending} className="rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50">{pending ? copy.pending : copy.submit}</button>
    </form>
  )
}
