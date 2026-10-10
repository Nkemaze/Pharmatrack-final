import { useState } from 'react'
import { AlertBanner, Button, Card, CardBody, CardHeader, EmptyState, LoadingScreen, PageHeader } from '@/components/ui'
import { useLossReports, useMarkLossReported } from '@/lib/queries'
import { downloadCsv, ApiError } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/format'

export function LossReportsPage() {
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [unreportedOnly, setUnreportedOnly] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const { data, isLoading, isError } = useLossReports({ page, pageSize, unreportedOnly })
  const markReported = useMarkLossReported()

  const reports = data?.data ?? []
  const meta = data?.meta

  const onExport = async () => {
    setExporting(true)
    setExportError(null)
    try {
      await downloadCsv('/loss-reports/export', `loss-reports-${new Date().toISOString().slice(0, 10)}.csv`, {
        unreportedOnly,
      })
    } catch (err) {
      setExportError(err instanceof ApiError ? err.message : 'Unable to export loss reports.')
    } finally {
      setExporting(false)
    }
  }

  const onMarkReported = (id: string) => {
    const reference = window.prompt('Authority reference (optional):') ?? undefined
    markReported.mutate(
      { id, authorityReference: reference || undefined },
      {
        onSuccess: () => setNotice('Loss report marked as reported to the authorities.'),
        onError: (err) => setExportError(err instanceof ApiError ? err.message : 'Unable to update the report.'),
      },
    )
  }

  return (
    <div>
      <PageHeader
        title="Loss reports"
        description="Stock losses that must be declared to the authorities"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outlined" icon="download" onClick={onExport} loading={exporting}>Export CSV</Button>
          </div>
        }
      />

      {exportError && <p className="mb-3 text-body-sm text-error">{exportError}</p>}
      {notice && (
        <div className="mb-3">
          <AlertBanner tone="success" icon="task_alt">{notice}</AlertBanner>
        </div>
      )}

      <Card>
        <CardHeader
          title="Reports"
          actions={
            <label className="flex items-center gap-2 text-body-sm text-on-surface">
              <input
                type="checkbox"
                checked={unreportedOnly}
                onChange={(e) => {
                  setUnreportedOnly(e.target.checked)
                  setPage(1)
                }}
                className="h-4 w-4"
              />
              Unreported only
            </label>
          }
        />
        <CardBody>
          {isLoading ? (
            <LoadingScreen />
          ) : isError ? (
            <EmptyState icon="error" title="Unable to load loss reports" />
          ) : reports.length === 0 ? (
            <EmptyState icon="report" title="No loss reports" note="Losses recorded through stock movements appear here." />
          ) : (
            <div className="table-container">
              <table className="w-full min-w-[720px] text-left text-body-sm">
                <thead>
                  <tr className="border-b border-outline-variant bg-surface-container-low text-label-bold uppercase text-on-surface-variant">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Batch</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="zebra-row border-b border-outline-variant/60">
                      <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDate(report.date)}</td>
                      <td className="px-4 py-3 font-medium text-on-surface">{report.productName ?? '—'}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{report.batchNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-error">{formatNumber(report.quantity ?? 0)}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{report.reason ?? '—'}</td>
                      <td className="px-4 py-3">
                        {report.reported ? (
                          <span className="status-pill bg-tertiary-fixed text-on-tertiary-container">Reported</span>
                        ) : (
                          <span className="status-pill bg-error-container text-on-error-container">Unreported</span>
                        )}
                        {report.authorityReference && (
                          <p className="mt-0.5 text-body-sm text-on-surface-variant">{report.authorityReference}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!report.reported && (
                          <Button size="sm" variant="outlined" onClick={() => onMarkReported(report.id)} loading={markReported.isPending}>
                            Mark reported
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-body-sm text-on-surface-variant">Page {meta.page} of {meta.totalPages}</p>
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