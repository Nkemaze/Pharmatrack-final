import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AlertBanner, Button, Card, CardBody, CardHeader, EmptyState, ErrorBanner, Field, IconButton, Input, LoadingScreen } from '@/components/ui'
import { ExpiryBadge } from '@/components/badges'
import { useBatches, useCreateBatch, useProduct, useUpdateBatch } from '@/lib/queries'
import { formatDate, formatMoney, formatNumber, toLocalInputValue } from '@/lib/format'
import { ApiError } from '@/lib/api'
import type { Batch } from '@/lib/types'

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: product, isLoading, isError } = useProduct(id)
  const { data: batches } = useBatches(id)

  if (isLoading) return <LoadingScreen />
  if (isError || !product) {
    return (
      <EmptyState
        icon="error"
        title="Product not found"
        note="It may have been removed, or you do not have access to it."
        action={<Link to="/inventory"><Button variant="outlined">Back to inventory</Button></Link>}
      />
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/inventory" className="text-body-sm font-semibold text-secondary hover:underline">
            ← Inventory
          </Link>
          <h1 className="mt-1 text-display">{product.name}</h1>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {[product.category, product.strength, product.dosageForm].filter(Boolean).join(' · ') || 'Uncategorised'}
            {product.barcode ? ` · barcode ${product.barcode}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/movements/new?productId=${product.id}`}>
            <Button variant="secondary" icon="swap_vert">Record movement</Button>
          </Link>
          <Link to={`/inventory/${product.id}/edit`}>
            <Button variant="outlined" icon="edit">Edit</Button>
          </Link>
        </div>
      </div>

      {product.isControlled && (
        <AlertBanner tone="warning" icon="gpp_maybe">
          This product is on the controlled substances list (Law 90/035). Sales must record a dispensing reason.
        </AlertBanner>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-label-bold uppercase text-on-surface-variant">Total stock</p>
          <p className={`mt-1 text-headline-md ${product.isLowStock ? 'text-error' : ''}`}>
            {formatNumber(product.totalStock)} <span className="text-body-md text-on-surface-variant">{product.unitLabel}</span>
          </p>
          {product.isLowStock && <p className="mt-0.5 text-body-sm text-error">Below restocking threshold</p>}
        </Card>
        <Card className="p-4">
          <p className="text-label-bold uppercase text-on-surface-variant">Unit price</p>
          <p className="mt-1 text-headline-md">{formatMoney(product.pricePerUnit)}</p>
          {product.pricePerPacket != null && (
            <p className="text-body-sm text-on-surface-variant">{formatMoney(product.pricePerPacket)} / {product.packetSize ?? 'packet'}</p>
          )}
        </Card>
        <Card className="p-4">
          <p className="text-label-bold uppercase text-on-surface-variant">Earliest expiry</p>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-headline-md">{product.expiry.minExpiryDate ? formatDate(product.expiry.minExpiryDate) : '—'}</p>
            <ExpiryBadge status={product.expiry.status} />
          </div>
          <p className="mt-0.5 text-body-sm text-on-surface-variant">
            Threshold: {product.lowStockThreshold != null ? `${product.lowStockThreshold} ${product.unitLabel}` : 'not set'}
          </p>
        </Card>
      </div>

      <BatchesCard productId={product.id} batches={batches ?? []} />
    </div>
  )
}

function BatchesCard({ productId, batches }: { productId: string; batches: Batch[] | undefined }) {
  const [adding, setAdding] = useState(false)
  return (
    <Card>
      <CardHeader
        title={`Batches (${batches?.length ?? 0})`}
        subtitle="Stock is tracked per batch — record movements against a batch"
        actions={
          <Button size="sm" icon="add" onClick={() => setAdding((v) => !v)}>
            {adding ? 'Cancel' : 'Add batch'}
          </Button>
        }
      />
      <CardBody className="space-y-4">
        {adding && <AddBatchForm productId={productId} onDone={() => setAdding(false)} />}
        {!batches || batches.length === 0 ? (
          <EmptyState icon="batch_prediction" title="No batches yet" note="Add a batch to start tracking receive and movement history." />
        ) : (
          <div className="table-container">
            <table className="w-full min-w-[560px] text-left text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low text-label-bold uppercase text-on-surface-variant">
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Expiry date</th>
                  <th className="px-4 py-3">Received</th>
                  <th className="px-4 py-3 text-right">Remaining</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <BatchRow key={batch.id} batchId={batch.id} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function AddBatchForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const mutation = useCreateBatch(productId)
  const [batchNumber, setBatchNumber] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [initialQuantity, setInitialQuantity] = useState('')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    mutation.mutate(
      {
        batchNumber: batchNumber.trim() || null,
        expiryDate: expiryDate || null,
        initialQuantity: initialQuantity ? Number(initialQuantity) : null,
      },
      {
        onSuccess: () => {
          setBatchNumber('')
          setExpiryDate('')
          setInitialQuantity('')
          onDone()
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Field label="Batch number">
          <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="BATCH-001" />
        </Field>
        <Field label="Expiry date">
          <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </Field>
        <Field label="Received qty">
          <Input type="number" min={1} value={initialQuantity} onChange={(e) => setInitialQuantity(e.target.value)} placeholder="0" />
        </Field>
        <div className="flex items-end">
          <Button type="submit" className="w-full" loading={mutation.isPending} icon="add">
            Save batch
          </Button>
        </div>
      </div>
      {mutation.isError && <ErrorBanner message={mutation.error instanceof ApiError ? mutation.error.message : 'Unable to add the batch.'} />}
    </form>
  )
}

function BatchRow({ batchId }: { batchId: string }) {
  const { productId } = useParams<{ productId: string }>()
  const { data: batches } = useBatches(productId)
  const batch = batches?.find((b) => b.id === batchId)
  const updateBatch = useUpdateBatch()
  const [editing, setEditing] = useState(false)
  const [batchNumber, setBatchNumber] = useState(batch?.batchNumber ?? '')
  const [expiryDate, setExpiryDate] = useState(batch ? toLocalInputValue(batch.expiryDate) : '')

  if (!batch) return null

  const save = () => {
    updateBatch.mutate(
      { id: batch.id, payload: { batchNumber: batchNumber.trim() || null, expiryDate: expiryDate || null } },
      { onSuccess: () => setEditing(false) },
    )
  }

  if (editing) {
    return (
      <tr className="bg-surface-container-low">
        <td className="px-4 py-3">
          <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
        </td>
        <td className="px-4 py-3">
          <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </td>
        <td className="px-4 py-3 text-on-surface-variant">{formatDate(batch.receivedAt)}</td>
        <td className="px-4 py-3 text-right font-semibold">{formatNumber(batch.remaining)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-end gap-1">
            <Button size="sm" onClick={save} loading={updateBatch.isPending}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="zebra-row border-b border-outline-variant/60">
      <td className="px-4 py-3">
        <span className="font-medium text-on-surface">{batch.batchNumber || '—'}</span>
        <Link to={`/movements/new?productId=${productId}&batchId=${batch.id}`} className="ml-3 text-body-sm font-semibold text-secondary hover:underline">
          Move
        </Link>
      </td>
      <td className="px-4 py-3 text-on-surface">{batch.expiryDate ? formatDate(batch.expiryDate) : '—'}</td>
      <td className="px-4 py-3 text-on-surface-variant">{batch.receivedAt ? formatDate(batch.receivedAt) : '—'}</td>
      <td className="px-4 py-3 text-right font-semibold text-on-surface">{formatNumber(batch.remaining)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end">
          <IconButton label="Edit batch" icon="edit" onClick={() => { setEditing(true); setBatchNumber(batch.batchNumber ?? ''); setExpiryDate(batch.expiryDate ? toLocalInputValue(batch.expiryDate) : '') }} />
        </div>
      </td>
    </tr>
  )
}