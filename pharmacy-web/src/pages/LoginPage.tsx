import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from '@/components/AuthShell'
import { Button, Field, Input, ErrorBanner } from '@/components/ui'
import { useAuth } from '@/lib/auth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(identifier.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      const e = err as { code?: string; message?: string; retryAfter?: number }
      if (e.code === 'RATE_LIMITED') {
        setError(e.retryAfter ? `Too many attempts. Try again in ${Math.ceil(e.retryAfter / 60)} minute(s).` : 'Too many attempts. Try again shortly.')
      } else {
        setError(e.message ?? 'Unable to sign in.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      footer={
        <>
          New pharmacy?{' '}
          <Link to="/register">Apply for a pharmacy account</Link>
          <br />
          <Link to="/setup-admin">First time? Set up the admin console</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <ErrorBanner message={error ?? undefined} />
        <Field label="Email or username" required>
          <Input
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@pharmacy.cm"
            required
          />
        </Field>
        <Field label="Password" required>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </Field>
        <Button type="submit" className="w-full" loading={submitting} icon="login">
          Sign in
        </Button>
      </form>
    </AuthShell>
  )
}