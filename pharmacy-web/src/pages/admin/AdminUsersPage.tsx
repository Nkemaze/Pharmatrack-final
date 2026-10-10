import { useState, type FormEvent } from 'react'
import { AlertBanner, Button, Card, CardBody, CardHeader, EmptyState, ErrorBanner, Field, Input, LoadingScreen, PageHeader, Select } from '@/components/ui'
import { useCreateUser, useDeleteUser, usePharmacies, useUsers } from '@/lib/queries'
import type { User } from '@/lib/types'
import { formatDate, formatNumber } from '@/lib/format'
import { ApiError } from '@/lib/api'

const ROLE_FILTERS = [
  { value: '', label: 'All roles' },
  { value: 'ADMIN', label: 'Admins' },
  { value: 'PHARMACY', label: 'Pharmacy users' },
]

export function AdminUsersPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [role, setRole] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, isError } = useUsers({ page, pageSize, role: role || undefined })
  const deleteMutation = useDeleteUser()

  const users = data?.data ?? []
  const meta = data?.meta

  const onDelete = (user: User) => {
    if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) return
    setError(null)
    deleteMutation.mutate(user.id, {
      onError: (err) => setError(err instanceof ApiError ? err.message : 'Unable to delete the user.'),
    })
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage accounts for pharmacy staff and administrators"
        actions={
          <Button icon="person_add" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Hide form' : 'Create user'}
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}
      {showCreate && <CreateUserForm onDone={() => setShowCreate(false)} />}

      <Card>
        <CardHeader
          title="All users"
          actions={
            <Select className="w-44" value={role} onChange={(e) => { setRole(e.target.value); setPage(1) }} aria-label="Filter by role">
              {ROLE_FILTERS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </Select>
          }
        />
        <CardBody>
          {isLoading ? (
            <LoadingScreen />
          ) : isError ? (
            <EmptyState icon="error" title="Unable to load users" />
          ) : users.length === 0 ? (
            <EmptyState icon="group" title="No users found" note="User accounts will appear here." />
          ) : (
            <div className="table-container">
              <table className="w-full min-w-[720px] text-left text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-label-bold uppercase text-on-surface-variant">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="zebra-row border-b border-outline-variant/60">
                      <td className="px-4 py-3 font-medium text-on-surface">{user.name}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{user.email ?? '—'}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{user.role}</td>
                      <td className="px-4 py-3">
                        {user.status ? (
                          <span className={`status-pill ${user.status === 'PENDING' ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed' : 'bg-tertiary-fixed text-on-tertiary-container'}`}>
                            {user.status.toLowerCase()}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outlined" disabled={deleteMutation.isPending} onClick={() => onDelete(user)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-body-sm text-on-surface-variant">Page {meta.page} of {meta.totalPages} · {formatNumber(meta.total)} users</p>
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

function CreateUserForm({ onDone }: { onDone: () => void }) {
  const mutation = useCreateUser()
  const pharmaciesQuery = usePharmacies()
  const pharmacies = (pharmaciesQuery.data?.data ?? []).filter((p) => p.status === 'ACTIVE')

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('ADMIN')
  const [pharmacyId, setPharmacyId] = useState('')
  const [password, setPassword] = useState('')
  const [created, setCreated] = useState<User | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate(
      {
        name: name.trim(),
        email: email.trim() || undefined,
        role,
        pharmacyId: role === 'PHARMACY' && pharmacyId ? pharmacyId : undefined,
        password,
      },
      { onSuccess: (res) => setCreated(res.data as User) },
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader title="Create a user" subtitle="Create an administrator or a pharmacy staff account" />
      <CardBody>
        {created ? (
          <div className="space-y-3">
            <AlertBanner tone="success" icon="task_alt">User created successfully.</AlertBanner>
            <div className="rounded-lg bg-surface-container-low p-4 font-mono text-body-sm">
              <p>Name: <strong>{created.name}</strong></p>
              <p>Sign-in email: <strong>{created.email ?? created.name}</strong></p>
              <p>Initial password: <strong>{password}</strong></p>
              {created.mustUpdateProfile && <p className="text-on-surface-variant">This user must complete their profile and change the password.</p>}
            </div>
            <Button variant="outlined" onClick={onDone}>Done</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            {mutation.isError && <ErrorBanner message={mutation.error instanceof ApiError ? mutation.error.message : 'Unable to create the user.'} />}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
              <Field label="Role" required>
                <Select value={role} onChange={(e) => setRole(e.target.value)} required>
                  <option value="ADMIN">Administrator</option>
                  <option value="PHARMACY">Pharmacy staff</option>
                </Select>
              </Field>
              {role === 'PHARMACY' && (
                <Field label="Pharmacy" hint="Optional">
                  <Select value={pharmacyId} onChange={(e) => setPharmacyId(e.target.value)}>
                    <option value="">Unassigned</option>
                    {pharmacies.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Initial password" required hint="At least 8 characters">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outlined" onClick={onDone}>Cancel</Button>
              <Button type="submit" loading={mutation.isPending} icon="person_add">Create user</Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  )
}