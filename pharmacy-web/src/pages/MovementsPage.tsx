import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, CardBody, CardHeader, EmptyState, LoadingScreen, PageHeader, Select } from '@/components/ui'
import { MovementTypeBadge } from '@/components/badges'
import { useMovements } from '@/lib/queries'
import { downloadCsv, ApiError } from '@/lib/api'
import { formatDateTime, formatNumber } from '@/lib/format'

export function MovementsPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [type, setType] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const { data, isLoading, isError } = useMovements({
    page,
    pageSize,
    type: type || undefined,
  })

  const movements = data?.data ?? []
  const meta = data?.meta

  const onExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await downloadCsv('/movements/export', `movements-${new Date().toISOString().slice(0, 10)}.csv`, { type: type || undefined })
    } catch (err) {
      setExportError(err instanceof ApiError ? err.message : 'Unable to export movements.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Stock movements"
        description="A chronological log of every stock change"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outlined" icon="download" onClick={onExport} loading={exporting}>Export CSV</Button>
            <Link to="/movements/new">
              <Button icon="add">Record movement</Button>
            </Link>
          </div>
        }
      />

      {exportError && <p className="mb-3 text-body-sm text-error">{exportError}</p>}

      <Card>
        <CardHeader
          title="All movements"
          actions={
            <Select className="w-44" value={type} onChange={(e) => { setType(e.target.value); setPage(1) }} aria-label="Filter by type">
              <option value="">All types</option>
              <option value="RECEIPT">Receipts</option>
              <option value="SALE">Sales</option>
              <option value="RETURN">Returns</option>
              <option value="TRANSFER">Transfers</option>
              <option value="ADJUSTMENT">Adjustments</option>
              <option value="DESTRUCTION">Destruction</option>
              <option value="LOSS">Loss</option>
            </Select>
          }
        />
        <CardBody>
          {isLoading ? (
            <LoadingScreen />
          ) : isError ? (
            <EmptyState icon="error" title="Unable to load movements" />
          ) : movements.length === 0 ? (
            <EmptyState icon="swap_vert" title="No movements yet" note="Record a receipt or sale to start the ledger." />
          ) : (
            <div className="table-container">
              <table className="w-full min-w-[680px] text-left text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-label-bold uppercase text-on-surface-variant">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3">Counterparty</th>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">By</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => {
                    const isIn = movement.type === 'RECEIPT' || movement.type === 'RETURN' || movement.direction === 'INCREASE'
                    return (
                      <tr key={movement.id} className="zebra-row border-b border-outline-variant/60">
                        <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDateTime(movement.occurredAt)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-on-surface">{movement.product?.name ?? '—'}</p>
                          {movement.batchId && <p className="text-body-sm text-on-surface-variant">{movement.reason ?? ''}</p>}
                        </td>
                        <td className="px-4 py-3"><MovementTypeBadge type={movement.type} /></td>
                        <td className={`px-4 py-3 text-right font-bold ${isIn ? 'text-on-surface' : 'text-error'}`}>
                          {isIn ? '+' : '−'}{formatNumber(movement.quantity)}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">{movement.counterpartyName ?? '—'}</td>
                        <td className="px-4 py-3 text-on-surface-variant">
                          {movement.prescriptionNumber ?? movement.referenceNumber ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant">{movement.performedBy?.name ?? '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-body-sm text-on-surface-variant">
                Page {meta.page} of {meta.totalPages}
              </p>
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