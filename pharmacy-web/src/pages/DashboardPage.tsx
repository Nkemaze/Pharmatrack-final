import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AlertBanner, Card, CardBody, CardHeader, EmptyState, LoadingScreen, StatCard, StatusPillForStatus } from '@/components/ui'
import { ExpiryBadge, MovementTypeBadge } from '@/components/badges'
import { useAuth } from '@/lib/auth'
import { useDashboard, useLossReports, usePharmacies, useUsers } from '@/lib/queries'
import { formatDateTime, formatNumber } from '@/lib/format'

function SectionCard({ title, to, linkLabel, children }: { title: string; to?: string; linkLabel?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader
        title={title}
        actions={
          to ? (
            <Link to={to} className="text-body-sm font-semibold text-secondary hover:underline">
              {linkLabel ?? 'View all'}
            </Link>
          ) : undefined
        }
      />
      <CardBody>{children}</CardBody>
    </Card>
  )
}

export function DashboardPage() {
  const { user } = useAuth()

  if (user?.role === 'ADMIN') return <AdminDashboard />
  return <PharmacyDashboard />
}

// ---------------------------------------------------------------------------

function PharmacyDashboard() {
  const { data, isLoading, isError } = useDashboard()

  if (isLoading) return <LoadingScreen />
  if (isError || !data) {
    return (
      <EmptyState
        icon="error"
        title="Unable to load the dashboard"
        note="Check that the backend is reachable, then refresh."
      />
    )
  }

  const alerts = [...data.expired, ...data.expiringSoon]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="inventory_2" label="Products" value={formatNumber(data.totals.products)} />
        <StatCard icon="batch_prediction" label="Batches" value={formatNumber(data.totals.batches)} tone="neutral" />
        <StatCard icon="warning" label="Low stock" value={data.lowStock.length} tone={data.lowStock.length ? 'warning' : 'success'} />
        <StatCard
          icon="schedule"
          label="Expiring / expired"
          value={alerts.length}
          tone={alerts.length ? 'danger' : 'success'}
        />
      </div>

      {data.lowStock.length > 0 && (
        <AlertBanner tone="warning" icon="inventory">
          <strong>{data.lowStock.length}</strong> product(s) are at or below their restocking threshold.
          <Link to="/inventory" className="ml-2 font-semibold underline">
            Review inventory
          </Link>
        </AlertBanner>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Low stock" to="/inventory">
          {data.lowStock.length === 0 ? (
            <EmptyState icon="task_alt" title="All good" note="No products are below their threshold." />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {data.lowStock.slice(0, 6).map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link to={`/inventory/${product.id}`} className="truncate font-semibold text-on-surface hover:text-secondary">
                      {product.name}
                    </Link>
                    <p className="text-body-sm text-on-surface-variant">
                      {product.strength ? `${product.strength} · ` : ''}
                      {formatNumber(product.totalStock)} {product.unitLabel} left
                    </p>
                  </div>
                  <ExpiryBadge status={product.expiry.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Expiry watch" to="/inventory">
          {alerts.length === 0 ? (
            <EmptyState icon="calendar_month" title="Nothing expiring soon" note="All batches have a healthy shelf life." />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {alerts.slice(0, 6).map((product) => (
                <li key={product.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <Link to={`/inventory/${product.id}`} className="truncate font-semibold text-on-surface hover:text-secondary">
                      {product.name}
                    </Link>
                    <p className="text-body-sm text-on-surface-variant">
                      {product.expiry.minExpiryDate ?? '—'} · {product.expiry.daysToExpiry != null ? `${product.expiry.daysToExpiry} day(s)` : 'n/a'}
                    </p>
                  </div>
                  <ExpiryBadge status={product.expiry.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent movements" to="/movements">
        {data.recentMovements.length === 0 ? (
          <EmptyState icon="swap_vert" title="No movements yet" note="Record a movement to start tracking your stock." />
        ) : (
          <div className="table-container">
            <table className="w-full min-w-[560px] text-left text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-label-bold uppercase text-on-surface-variant">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody className="zebra-container">
                {data.recentMovements.map((movement) => (
                  <tr key={movement.id} className="zebra-row border-b border-outline-variant/60">
                    <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDateTime(movement.occurredAt)}</td>
                    <td className="px-4 py-3 font-medium text-on-surface">{movement.product?.name ?? '—'}</td>
                    <td className="px-4 py-3"><MovementTypeBadge type={movement.type} /></td>
                    <td className="px-4 py-3 text-right font-semibold">{movement.type === 'RECEIPT' || movement.direction === 'INCREASE' ? '+' : '−'}{formatNumber(movement.quantity)}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{movement.performedBy?.name ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

// ---------------------------------------------------------------------------

function AdminDashboard() {
  const pharmacies = usePharmacies({ pageSize: 5, status: 'PENDING' })
  const recent = usePharmacies({ pageSize: 5 })
  const losses = useLossReports({ pageSize: 5 })
  const users = useUsers({ pageSize: 1 })

  if (pharmacies.isLoading || recent.isLoading || users.isLoading) return <LoadingScreen />

  const pending = pharmacies.data?.data ?? []
  const all = recent.data?.data ?? []
  const reports = losses.data?.data ?? []
  const totalUsers = users.data?.meta.total ?? 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="storefront" label="Pharmacies" value={formatNumber(recent.data?.meta.total ?? 0)} />
        <StatCard icon="pending_actions" label="Pending applications" value={pending.length} tone="warning" />
        <StatCard icon="group" label="Users" value={formatNumber(totalUsers)} tone="neutral" />
        <StatCard icon="warning" label="Reported losses" value={formatNumber(reports.length)} tone="danger" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SectionCard title="Pending applications" to="/admin/pharmacies" linkLabel="Review">
          {pending.length === 0 ? (
            <EmptyState icon="task_alt" title="Nothing to review" note="No pharmacy applications are awaiting approval." />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {pending.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-on-surface">{p.name}</p>
                    <p className="text-body-sm text-on-surface-variant">{p.city ?? '—'} · {p.email ?? ''}</p>
                  </div>
                  <span className="status-pill bg-tertiary-fixed-dim text-on-tertiary-fixed">Pending</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="Recent loss reports" to="/loss-reports">
          {reports.length === 0 ? (
            <EmptyState icon="report" title="No losses reported" note="Stock losses will appear here across pharmacies." />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-on-surface">{r.productName ?? '—'}</p>
                    <p className="text-body-sm text-on-surface-variant">Batch {r.batchNumber ?? '—'} · qty {r.quantity} · reason: {r.reason ?? '—'}</p>
                  </div>
                  <span className={`status-pill ${r.reported ? 'bg-tertiary-fixed text-on-tertiary-container' : 'bg-error-container text-on-error-container'}`}>
                    {r.reported ? 'Reported' : 'Unreported'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent pharmacies" to="/admin/pharmacies">
        <div className="table-container">
          <table className="w-full min-w-[560px] text-left text-body-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-label-bold uppercase text-on-surface-variant">
                <th className="px-4 py-3">Pharmacy</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Applicant</th>
              </tr>
            </thead>
            <tbody>
              {all.map((p) => {
                const s = StatusPillForStatus(p.status)
                return (
                  <tr key={p.id} className="zebra-row border-b border-outline-variant/60">
                    <td className="px-4 py-3 font-medium text-on-surface">{p.name}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{p.city ?? '—'}</td>
                    <td className="px-4 py-3"><span className={`status-pill ${s.tone === 'success' ? 'bg-tertiary-fixed text-on-tertiary-container' : s.tone === 'warning' ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed' : s.tone === 'danger' ? 'bg-error-container text-on-error-container' : 'bg-surface-container-high text-on-surface-variant'}`}>{s.label}</span></td>
                    <td className="px-4 py-3 text-on-surface-variant">{p.applicant?.[0] ? `${p.applicant[0].name} · ${p.applicant[0].email}` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  )
}