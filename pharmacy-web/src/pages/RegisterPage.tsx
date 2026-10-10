import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from '@/components/AuthShell'
import { Button, Field, Input, ErrorBanner, AlertBanner, Textarea } from '@/components/ui'
import { api } from '@/lib/api'

export function RegisterPage() {
  const navigate = useNavigate()
  const [pharmacyName, setPharmacyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [applicationId, setApplicationId] = useState<string | null>(null)
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
      const { data } = await api.post<{ applicationId: string }>('/auth/register/pharmacy', {
        pharmacyName: pharmacyName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        city: city.trim() || undefined,
        address: address.trim() || undefined,
      }, { auth: false })
      setApplicationId(data.applicationId)
    } catch (err) {
      const e = err as { message?: string }
      setError(e.message ?? 'Unable to submit the application.')
    } finally {
      setSubmitting(false)
    }
  }

  if (applicationId) {
    return (
      <AuthShell
        title="Application submitted"
        footer={<Link to="/login">Back to sign in</Link>}
      >
        <div className="space-y-4">
          <AlertBanner tone="success" icon="task_alt">
            Your pharmacy application has been received. The administrator will review it and
            activate your account.
          </AlertBanner>
          <p className="text-body-sm text-on-surface-variant">
            Application reference:
            <span className="ml-1 font-mono font-semibold text-on-surface">{applicationId}</span>
          </p>
          <p className="text-body-sm text-on-surface-variant">
            Once approved, sign in with the email and password you chose and complete your pharmacy
            profile.
          </p>
          <Button type="button" className="w-full" onClick={() => navigate('/login')}>
            Go to sign in
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Apply for a pharmacy account"
      footer={
        <>
          Already have an account? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <ErrorBanner message={error ?? undefined} />
        <Field label="Pharmacy name" required>
          <Input
            value={pharmacyName}
            onChange={(e) => setPharmacyName(e.target.value)}
            placeholder="Pharmacie du Centre"
            required
            minLength={3}
          />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@pharmacy.cm"
            required
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237 6XX XX XX XX" />
          </Field>
          <Field label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Douala" />
          </Field>
        </div>
        <Field label="Address">
          <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rue X, Quartier Y" />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Password" required hint="At least 8 characters">
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </Field>
          <Field label="Confirm password" required>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </Field>
        </div>
        <Button type="submit" className="w-full" loading={submitting} icon="send">
          Submit application
        </Button>
      </form>
    </AuthShell>
  )
}