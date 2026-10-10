import { useState, type FormEvent } from 'react'
import { AlertBanner, Button, Card, CardBody, CardHeader, EmptyState, ErrorBanner, Field, Input, LoadingScreen, PageHeader, Select } from '@/components/ui'
import { useDeletePharmacy, usePharmacies, usePharmacyStatus, useProvisionPharmacy } from '@/lib/queries'
import { formatDate, formatNumber } from '@/lib/format'
import { ApiError } from '@/lib/api'

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'SUSPENDED', label: 'Suspended' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DELETED', label: 'Deleted' },
]

const STATUS_PILL: Record<string, string> = {
  PENDING: 'bg-tertiary-fixed-dim text-on-tertiary-fixed',
  ACTIVE: 'bg-tertiary-fixed text-on-tertiary-container',
  SUSPENDED: 'bg-error-container text-on-error-container',
  REJECTED: 'bg-surface-container-high text-on-surface-variant',
  DELETED: 'bg-surface-container-high text-on-surface-variant',
}

export function AdminPharmaciesPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [status, setStatus] = useState('')
  const [showProvision, setShowProvision] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, isError } = usePharmacies({ page, pageSize, status: status || undefined })
  const setStatusMutation = usePharmacyStatus()
  const deleteMutation = useDeletePharmacy()

  const pharmacies = data?.data ?? []
  const meta = data?.meta

  const changeStatus = (id: string, name: string, status: string) => {
    const label = status.toLowerCase()
    if (!window.confirm(`Set "${name}" status to ${label}?`)) return
    setError(null)
    setStatusMutation.mutate(
      { id, status },
      { onError: (err) => setError(err instanceof ApiError ? err.message : 'Unable to update the pharmacy.') },
    )
  }

  const onDelete = (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return
    setError(null)
    deleteMutation.mutate(id, {
      onError: (err) => setError(err instanceof ApiError ? err.message : 'Unable to delete the pharmacy.'),
    })
  }

  return (
    <div>
      <PageHeader
        title="Pharmacies"
        description="Review applications and manage pharmacy accounts"
        actions={
          <Button icon="add" onClick={() => setShowProvision((v) => !v)}>
            {showProvision ? 'Hide form' : 'Provision pharmacy'}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}
      {showProvision && <ProvisionPharmacyForm onDone={() => setShowProvision(false)} />}

      <Card>
        <CardHeader
          title="All pharmacies"
          actions={
            <Select className="w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} aria-label="Filter by status">
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          }
        />
        <CardBody>
          {isLoading ? (
            <LoadingScreen />
          ) : isError ? (
            <EmptyState icon="error" title="Unable to load pharmacies" />
          ) : pharmacies.length === 0 ? (
            <EmptyState icon="storefront" title="No pharmacies found" note="Applications submitted by pharmacies will appear here." />
          ) : (
            <div className="table-container">
              <table className="w-full min-w-[820px] text-left text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-label-bold uppercase text-on-surface-variant">
                    <th className="px-4 py-3">Pharmacy</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pharmacies.map((pharmacy) => (
                    <tr key={pharmacy.id} className="zebra-row border-b border-outline-variant/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-on-surface">{pharmacy.name}</p>
                        <p className="text-body-sm text-on-surface-variant">{pharmacy.email ?? ''}</p>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">{pharmacy.city ?? '—'}</td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {pharmacy.applicant?.[0] ? `${pharmacy.applicant[0].name} · ${pharmacy.applicant[0].email}` : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDate(pharmacy.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`status-pill ${STATUS_PILL[pharmacy.status ?? ''] ?? 'bg-surface-container-high text-on-surface-variant'}`}>
                          {(pharmacy.status ?? '').toLowerCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RowActions
                          status={pharmacy.status}
                          onStatus={(s) => changeStatus(pharmacy.id, pharmacy.name, s)}
                          onDelete={() => onDelete(pharmacy.id, pharmacy.name)}
                          busy={setStatusMutation.isPending || deleteMutation.isPending}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-body-sm text-on-surface-variant">Page {meta.page} of {meta.totalPages} · {formatNumber(meta.total)} pharmacies</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outlined" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button size="sm" variant="outlined" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

function RowActions({
  status,
  onStatus,
  onDelete,
  busy,
}: {
  status?: string
  onStatus: (status: string) => void
  onDelete: () => void
  busy: boolean
}) {
  const actions =
    status === 'PENDING'
      ? [{ label: 'Approve', status: 'ACTIVE', primary: true }, { label: 'Reject', status: 'REJECTED', primary: false }]
      : status === 'ACTIVE'
        ? [{ label: 'Suspend', status: 'SUSPENDED', primary: false }]
        : status === 'SUSPENDED'
          ? [{ label: 'Reactivate', status: 'ACTIVE', primary: false }, { label: 'Delete', status: 'DELETE', danger: true }]
          : status === 'REJECTED'
            ? [{ label: 'Approve', status: 'ACTIVE', primary: true }]
            : []

  if (actions.length === 0) return null
  return (
    <div className="flex items-center justify-end gap-1">
      {actions.map((action) =>
        action.status === 'DELETE' ? (
          <Button key={action.status} size="sm" variant="outlined" disabled={busy} onClick={onDelete}>{action.label}</Button>
        ) : (
          <Button
            key={action.status}
            size="sm"
            variant={action.primary ? 'primary' : 'outlined'}
            disabled={busy}
            onClick={() => onStatus(action.status)}
          >
            {action.label}
          </Button>
        ),
      )}
    </div>
  )
}

function ProvisionPharmacyForm({ onDone }: { onDone: () => void }) {
  const mutation = useProvisionPharmacy()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [password, setPassword] = useState('')
  const [created, setCreated] = useState<{ id: string; user: { name: string; email: string | null } } | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(
      {
        name: name.trim(),
        email: email.trim() || undefined,
        password,
        phone: phone.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
      },
      {
        onSuccess: (res) => {
          setCreated(res.data as { id: string; user: { name: string; email: string | null } })
        },
      },
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader title="Provision a pharmacy" subtitle="Creates an active pharmacy account; the pharmacist must complete their profile and change the password" />
      <CardBody>
        {created ? (
          <div className="space-y-3">
            <AlertBanner tone="success" icon="task_alt">
              Pharmacy created. Share these credentials with the pharmacist:
            </AlertBanner>
            <div className="rounded-lg bg-surface-container-low p-4 font-mono text-body-sm">
              <p>Sign-in email: <strong>{created.user.email ?? created.user.name}</strong></p>
              <p>Initial password: <strong>{password}</strong></p>
              <p className="text-on-surface-variant">They must set a new password and complete their profile.</p>
            </div>
            <Button variant="outlined" onClick={onDone}>Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            {mutation.isError && <ErrorBanner message={mutation.error instanceof ApiError ? mutation.error.message : 'Unable to create the pharmacy.'} />}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Pharmacy name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Field>
              <Field label="Phone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
              <Field label="City">
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </Field>
              <Field label="Initial password" required hint="At least 8 characters">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outlined" onClick={onDone}>Cancel</Button>
              <Button type="submit" loading={mutation.isPending} icon="storefront">Create pharmacy</Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  )
}