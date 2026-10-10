import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertBanner, Button, Card, CardBody, EmptyState, IconButton, Input, LoadingScreen, PageHeader, Select } from '@/components/ui'
import { ExpiryBadge } from '@/components/badges'
import { useProducts } from '@/lib/queries'
import { formatMoney, formatNumber } from '@/lib/format'
import type { Product } from '@/lib/types'

export function InventoryPage() {
  const [qInput, setQInput] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    const timer = setTimeout(() => {
      setQ(qInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [qInput])

  const { data, isLoading, isError } = useProducts({ q: q || undefined, page, pageSize })

  const products = data?.data ?? []
  const meta = data?.meta

  const lowCount = products.filter((p) => p.isLowStock).length
  const expiredCount = products.filter((p) => p.expiry.status === 'EXPIRED').length

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Your products, batches and stock levels"
        actions={
          <Link to="/inventory/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-body-md font-medium text-on-primary hover:opacity-90">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
            New product
          </Link>
        }
      />

      {isError ? (
        <EmptyState icon="error" title="Something went wrong" note="Refresh the page to try again." />
      ) : (
        <div className="space-y-4">
          {(lowCount > 0 || expiredCount > 0) && (
            <div className="flex flex-wrap gap-2">
              {lowCount > 0 && (
                <AlertBanner tone="warning" icon="inventory">
                  {lowCount} product(s) at or below restocking threshold.
                </AlertBanner>
              )}
              {expiredCount > 0 && (
                <AlertBanner tone="danger" icon="error">
                  {expiredCount} product(s) have expired stock.
                </AlertBanner>
              )}
            </div>
          )}

          <Card>
            <CardBody className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
                  </span>
                  <Input
                    className="pl-9"
                    placeholder="Search by name, barcode, category…"
                    value={qInput}
                    onChange={(e) => setQInput(e.target.value)}
                  />
                </div>
                <Select
                  className="w-32"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value))
                    setPage(1)
                  }}
                  aria-label="Page size"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </Select>
              </div>

              {isLoading ? (
                <LoadingScreen />
              ) : products.length === 0 ? (
                <EmptyState
                  icon="inventory_2"
                  title={q ? 'No products match your search' : 'No products yet'}
                  note={q ? 'Try a different search term.' : 'Add your first product to start tracking stock.'}
                  action={
                    !q ? (
                      <Link to="/inventory/new">
                        <Button icon="add">Add your first product</Button>
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <div className="table-container">
                  <table className="w-full min-w-[720px] text-left text-body-sm">
                    <thead>
                      <tr className="border-b border-outline-variant bg-surface-container-low text-label-bold uppercase text-on-surface-variant">
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Stock</th>
                        <th className="px-4 py-3 text-right">Unit price</th>
                        <th className="px-4 py-3">Expiry</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <InventoryRow key={product.id} product={product} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-body-sm text-on-surface-variant">
                    Page {meta.page} of {meta.totalPages} · {formatNumber(meta.total)} products
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outlined"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outlined"
                      disabled={page >= meta.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  )
}

function InventoryRow({ product }: { product: Product }) {
  const low = product.isLowStock
  const controlled = product.isControlled
  return (
    <tr className="zebra-row border-b border-outline-variant/60">
      <td className="px-4 py-3">
        <Link to={`/inventory/${product.id}`} className="font-semibold text-on-surface hover:text-secondary">
          {product.name}
        </Link>
        <p className="text-body-sm text-on-surface-variant">
          {[product.strength, product.dosageForm].filter(Boolean).join(' · ') || '—'}
          {product.barcode ? ` · ${product.barcode}` : ''}
        </p>
      </td>
      <td className="px-4 py-3 text-on-surface-variant">{product.category ?? '—'}</td>
      <td className="px-4 py-3 text-right">
        <span className={low ? 'font-bold text-error' : 'font-semibold text-on-surface'}>
          {formatNumber(product.totalStock)}
        </span>
        <span className="text-body-sm text-on-surface-variant"> {product.unitLabel}</span>
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap text-on-surface">{formatMoney(product.pricePerUnit)}</td>
      <td className="px-4 py-3">
        {product.expiry.status === 'NONE' ? (
          <span className="text-body-sm text-on-surface-variant">—</span>
        ) : (
          <ExpiryBadge status={product.expiry.status} />
        )}
      </td>
      <td className="px-4 py-3">
        {product.expiry.status === 'EXPIRED' ? (
          <span className="status-pill bg-error-container text-on-error-container">Expired</span>
        ) : low ? (
          <span className="status-pill bg-tertiary-fixed-dim text-on-tertiary-fixed">Low</span>
        ) : (
          <span className="status-pill bg-tertiary-fixed text-on-tertiary-container">In stock</span>
        )}
        {controlled && (
          <span className="ml-1 status-pill bg-surface-container-high text-on-surface-variant" title="Controlled substance">
            Rx*
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Link to={`/movements/new?productId=${product.id}`}>
            <IconButton label="Record movement" icon="swap_vert" />
          </Link>
          <Link to={`/inventory/${product.id}/edit`}>
            <IconButton label="Edit product" icon="edit" />
          </Link>
        </div>
      </td>
    </tr>
  )
}