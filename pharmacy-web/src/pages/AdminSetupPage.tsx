import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '@/components/AuthShell'
import { Button, Field, Input, ErrorBanner, AlertBanner } from '@/components/ui'
import { api } from '@/lib/api'

export function AdminSetupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [setupCode, setSetupCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await api.post<unknown>(
        '/auth/setup-admin',
        { name: name.trim(), email: email.trim(), password, setupCode },
        { auth: false },
      )
      setDone(true)
    } catch (err) {
      const e = err as { code?: string; message?: string }
      if (e.code === 'CONFLICT') {
        setError('The administrator account already exists. Sign in instead.')
      } else {
        setError(e.message ?? 'Unable to set up the administrator account.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Set up the admin console"
      footer={
        <>
          <Link to="/login">Back to sign in</Link>
        </>
      }
    >
      {done ? (
        <div className="space-y-4">
          <AlertBanner tone="success" icon="task_alt">
            The administrator account was created. You can now sign in as an admin.
          </AlertBanner>
          <Button type="button" className="w-full" onClick={() => navigate('/login')}>
            Go to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <ErrorBanner message={error ?? undefined} />
          <Field label="Full name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={3} placeholder="Admin Name" />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@pharmatrack.local" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Password" required hint="At least 8 characters">
              <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </Field>
            <Field label="Confirm password" required>
              <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
            </Field>
          </div>
          <Field label="Setup code" required>
            <Input type="password" value={setupCode} onChange={(e) => setSetupCode(e.target.value)} required placeholder="Provided by your administrator" />
          </Field>
          <Button type="submit" className="w-full" loading={submitting} icon="admin_panel_settings">
            Create administrator
          </Button>
        </form>
      )}
    </AuthShell>
  )
}