import { useState, type FormEvent } from 'react'
import { AlertBanner, Button, Card, CardBody, CardHeader, ErrorBanner, Field, Input, PageHeader, Textarea } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/lib/theme'
import { api, ApiError } from '@/lib/api'
import { useInvalidate } from '@/lib/query'
import { Icon } from '@/components/Icon'

export function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const isAdmin = user?.role === 'ADMIN'
  const pharmacy = user?.pharmacy

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Your account, pharmacy profile and preferences" />

      <Card>
        <CardHeader title="Account" />
        <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ReadOnlyField label="Name" value={user?.name ?? '—'} />
          <ReadOnlyField label="Email" value={user?.email ?? '—'} />
          <ReadOnlyField label="Role" value={isAdmin ? 'Administrator' : 'Pharmacy'} />
          <ReadOnlyField label="Pharmacy" value={pharmacy?.name ?? (isAdmin ? '—' : '—')} />
        </CardBody>
      </Card>

      {!isAdmin && <PharmacyProfileForm />}

      <Card>
        <CardHeader title="Preferences" />
        <CardBody className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-high text-on-surface-variant">
              <Icon name={theme === 'dark' ? 'dark_mode' : 'light_mode'} size={20} />
            </div>
            <div>
              <p className="font-medium text-on-surface">Appearance</p>
              <p className="text-body-sm text-on-surface-variant">Switch between light and dark themes</p>
            </div>
          </div>
          <div className="inline-flex overflow-hidden rounded-lg border border-outline-variant">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`px-4 py-2 text-body-sm font-medium ${theme === 'light' ? 'bg-primary text-on-primary' : 'bg-transparent text-on-surface-variant'}`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 text-body-sm font-medium ${theme === 'dark' ? 'bg-primary text-on-primary' : 'bg-transparent text-on-surface-variant'}`}
            >
              Dark
            </button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="About" />
        <CardBody className="text-body-sm text-on-surface-variant">
          <p>PharmaTrack v2 — pharmacy inventory &amp; pharmaceutical logistics.</p>
          <p className="mt-1">Discovery directory and stock management. Not a marketplace: no cart or checkout, per Cameroon laws 90/035 and 97/019.</p>
        </CardBody>
      </Card>
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-label-bold uppercase text-on-surface-variant">{label}</p>
      <p className="mt-0.5 text-body-md text-on-surface">{value}</p>
    </div>
  )
}

function PharmacyProfileForm() {
  const { user, refreshUser } = useAuth()
  const invalidate = useInvalidate()
  const pharmacy = user?.pharmacy

  const [name, setName] = useState(pharmacy?.name ?? '')
  const [address, setAddress] = useState(pharmacy?.address ?? '')
  const [city, setCity] = useState(pharmacy?.city ?? '')
  const [phone, setPhone] = useState(pharmacy?.phone ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(pharmacy?.emergencyPhone ?? '')
  const [emergencyDesc, setEmergencyDesc] = useState(pharmacy?.emergencyDesc ?? '')
  const [latitude, setLatitude] = useState(pharmacy?.latitude ?? '')
  const [longitude, setLongitude] = useState(pharmacy?.longitude ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSaved(false)
    if (newPassword && newPassword !== confirm) {
      setError('New passwords do not match.')
      return
    }
    setSaving(true)
    try {
      await api.post('/auth/complete-profile', {
        currentPassword,
        newPassword: newPassword || currentPassword,
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
      await refreshUser()
      invalidate()
      setSaved(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirm('')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') setError('Your current password is incorrect.')
      else setError(err instanceof ApiError ? err.message : 'Unable to update your profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader title="Pharmacy profile" subtitle="Update your public details and change your password" />
      <CardBody>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <ErrorBanner message={error ?? undefined} />
          {saved && <AlertBanner tone="success" icon="task_alt">Your profile has been updated.</AlertBanner>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Pharmacy name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="City">
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </Field>
            <Field label="Emergency phone">
              <Input value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
            </Field>
          </div>
          <Field label="Address">
            <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Latitude" hint="Numeric">
              <Input inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
            </Field>
            <Field label="Longitude" hint="Numeric">
              <Input inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
            </Field>
            <Field label="Emergency description">
              <Input value={emergencyDesc} onChange={(e) => setEmergencyDesc(e.target.value)} />
            </Field>
          </div>

          <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
            <p className="mb-3 text-label-bold uppercase text-on-surface-variant">Change password</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Current password" required>
                <Input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </Field>
              <Field label="New password" hint="Leave blank to keep current">
                <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </Field>
              <Field label="Confirm new password">
                <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={saving} icon="save">Save changes</Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}