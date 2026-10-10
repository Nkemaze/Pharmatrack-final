import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthShell } from '@/components/AuthShell'
import { Button, Field, Input, ErrorBanner, AlertBanner, Textarea } from '@/components/ui'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { useInvalidate } from '@/lib/query'

export function ProfileSetupPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const invalidate = useInvalidate()

  const pharmacy = user?.pharmacy

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState(pharmacy?.name ?? '')
  const [address, setAddress] = useState(pharmacy?.address ?? '')
  const [city, setCity] = useState(pharmacy?.city ?? '')
  const [phone, setPhone] = useState(pharmacy?.phone ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(pharmacy?.emergencyPhone ?? '')
  const [emergencyDesc, setEmergencyDesc] = useState(pharmacy?.emergencyDesc ?? '')
  const [latitude, setLatitude] = useState(pharmacy?.latitude ?? '')
  const [longitude, setLongitude] = useState(pharmacy?.longitude ?? '')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    if (newPassword !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      await api.post<unknown>('/auth/complete-profile', {
        currentPassword,
        newPassword,
        pharmacy: {
          name: name.trim() || undefined,
          address: address.trim() || null,
          city: city.trim() || null,
          phone: phone.trim() || null,
          emergencyPhone: emergencyPhone.trim() || null,
          emergencyDesc: emergencyDesc.trim() || null,
          latitude: latitude.trim() || null,
          longitude: longitude.trim() || null,
        },
      })
      invalidate()
      await logout()
      setDone(true)
    } catch (err) {
      const e = err as { code?: string; message?: string }
      if (e.code === 'INVALID_CREDENTIALS') setError('Your current password is incorrect.')
      else setError(e.message ?? 'Unable to update your profile.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      title="Complete your pharmacy profile"
      footer={
        done ? (
          <span>Sign in again with your new password.</span>
        ) : (
          <span>Welcome! Set a new password and finalize your pharmacy details.</span>
        )
      }
    >
      {done ? (
        <div className="space-y-4">
          <AlertBanner tone="success" icon="task_alt">
            Your profile is complete. Please sign in again with your new password.
          </AlertBanner>
          <Button type="button" className="w-full" onClick={() => navigate('/login', { replace: true })}>
            Go to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <ErrorBanner message={error ?? undefined} />
          <Field label="Current password" required hint="The password you received when your account was activated">
            <Input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="New password" required hint="At least 8 characters">
              <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
            </Field>
            <Field label="Confirm new password" required>
              <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
            </Field>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <p className="mb-3 text-label-bold uppercase text-on-surface-variant">Pharmacy details</p>
            <div className="space-y-4">
              <Field label="Pharmacy name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="City">
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </Field>
                <Field label="Phone">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </Field>
              </div>
              <Field label="Address">
                <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Emergency phone">
                  <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
                </Field>
                <Field label="Emergency description">
                  <Input value={emergencyDesc} onChange={(e) => setEmergencyDesc(e.target.value)} placeholder="e.g. 24h helpline" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Latitude" hint="Numeric, e.g. 4.0511">
                  <Input inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                </Field>
                <Field label="Longitude" hint="Numeric, e.g. 9.7679">
                  <Input inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                </Field>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" loading={submitting} icon="check_circle">
            Complete profile
          </Button>
        </form>
      )}
    </AuthShell>
  )
}