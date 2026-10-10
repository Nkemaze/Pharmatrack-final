import { useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertBanner, Button, Card, CardBody, CardHeader, ErrorBanner, Field, Input, LoadingScreen, Select, Textarea } from '@/components/ui'
import { MOVEMENT_TYPES, type AdjustmentDirection, type MovementType } from '@/lib/types'
import { useBatches, useCreateMovement, useProducts } from '@/lib/queries'
import { formatNumber } from '@/lib/format'
import { ApiError } from '@/lib/api'

const nowLocal = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function RecordMovementPage() {
  const [searchParams] = useSearchParams()
  const presetProductId = searchParams.get('productId') ?? undefined
  const presetBatchId = searchParams.get('batchId') ?? undefined

  const productsQuery = useProducts({ pageSize: 100 })
  const products = productsQuery.data?.data ?? []

  const [productId, setProductId] = useState(presetProductId ?? '')
  const batchesQuery = useBatches(productId || undefined)
  const batches = batchesQuery.data ?? []

  const [batchId, setBatchId] = useState(presetBatchId ?? '')
  const [type, setType] = useState<MovementType>('RECEIPT')
  const [direction, setDirection] = useState<AdjustmentDirection>('INCREASE')
  const [quantity, setQuantity] = useState('1')
  const [counterpartyName, setCounterpartyName] = useState('')
  const [counterpartyAddress, setCounterpartyAddress] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [prescriptionNumber, setPrescriptionNumber] = useState('')
  const [reason, setReason] = useState('')
  const [occurredAt, setOccurredAt] = useState(nowLocal())
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ newBatchStock: number } | null>(null)

  const selectedBatch = useMemo(() => batches.find((b) => b.id === batchId), [batches, batchId])

  const mutation = useCreateMovement()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setResult(null)
    mutation.mutate(
      {
        batchId,
        type,
        quantity: Number(quantity),
        direction: type === 'ADJUSTMENT' ? direction : undefined,
        counterpartyName: counterpartyName.trim() || null,
        counterpartyAddress: counterpartyAddress.trim() || null,
        referenceNumber: referenceNumber.trim() || null,
        prescriptionNumber: prescriptionNumber.trim() || null,
        reason: reason.trim() || null,
        occurredAt: new Date(occurredAt).toISOString(),
      },
      {
        onSuccess: (res) => {
          setResult(res.data)
          setQuantity('1')
        },
        onError: (err) => {
          setError(err instanceof ApiError ? err.message : 'Unable to record the movement.')
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/movements" className="text-body-sm font-semibold text-secondary hover:underline">← Movements</Link>
      <h1 className="mt-1 text-display">Record a movement</h1>
      <p className="mt-1 text-body-md text-on-surface-variant">Receipts, sales, transfers, adjustments, destruction and loss</p>

      {result && (
        <div className="mt-4">
          <AlertBanner tone="success" icon="task_alt">
            Movement recorded. New batch stock: <strong>{formatNumber(result.newBatchStock)}</strong>.
          </AlertBanner>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 space-y-6" noValidate>
        <ErrorBanner message={error ?? undefined} />

        <Card>
          <CardHeader title="Batch" subtitle="Choose a product, then the batch it came from" />
          <CardBody className="space-y-4">
            <Field label="Product" required>
              {productsQuery.isLoading ? (
                <LoadingScreen />
              ) : (
                <Select value={productId} onChange={(e) => { setProductId(e.target.value); setBatchId(e.target.value === presetProductId ? presetBatchId ?? '' : '') }} required>
                  <option value="">Select a product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.strength ? ` · ${p.strength}` : ''}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {productId && (
              <Field label="Batch" required hint={selectedBatch ? `Current stock: ${formatNumber(selectedBatch.remaining)}` : undefined}>
                <Select value={batchId} onChange={(e) => setBatchId(e.target.value)} required>
                  <option value="">Select a batch…</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchNumber || 'No batch number'} · expiry {b.expiryDate ?? '—'} · {formatNumber(b.remaining)} left
                    </option>
                  ))}
                </Select>
                {batches.length === 0 && (
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    This product has no batches yet.{' '}
                    <Link to={`/inventory/${productId}`} className="font-semibold text-secondary hover:underline">
                      Add a batch
                    </Link>
                  </p>
                )}
              </Field>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Movement details" />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Type" required>
              <Select value={type} onChange={(e) => setType(e.target.value as MovementType)}>
                {MOVEMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} ({t.sign})
                  </option>
                ))}
              </Select>
            </Field>

            {type === 'ADJUSTMENT' && (
              <Field label="Direction" required>
                <Select value={direction} onChange={(e) => setDirection(e.target.value as AdjustmentDirection)}>
                  <option value="INCREASE">Increase (+)</option>
                  <option value="DECREASE">Decrease (−)</option>
                </Select>
              </Field>
            )}

            <Field label="Quantity" required hint={selectedBatch ? `Must not exceed ${formatNumber(selectedBatch.remaining)} if reducing stock` : undefined}>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </Field>

            <Field label="Occurred at" required hint="Defaults to now">
              <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} required />
            </Field>

            {type === 'SALE' && (
              <Field label="Prescription number">
                <Input value={prescriptionNumber} onChange={(e) => setPrescriptionNumber(e.target.value)} placeholder="RX-2026-0001" />
              </Field>
            )}

            {(type === 'RECEIPT' || type === 'TRANSFER' || type === 'RETURN') && (
              <>
                <Field label="Counterparty" hint={type === 'RECEIPT' ? 'Supplier name' : type === 'TRANSFER' ? 'Receiving pharmacy' : 'Customer name'}>
                  <Input value={counterpartyName} onChange={(e) => setCounterpartyName(e.target.value)} />
                </Field>
                <Field label="Counterparty address">
                  <Input value={counterpartyAddress} onChange={(e) => setCounterpartyAddress(e.target.value)} />
                </Field>
              </>
            )}

            <Field label="Reference number" hint="Invoice, delivery or internal reference">
              <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="INV-0001" />
            </Field>

            {(type === 'DESTRUCTION' || type === 'LOSS') && (
              <Field label="Reason" required hint={type === 'LOSS' ? 'Creates a loss report for the authorities' : undefined}>
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Damaged packaging, expired" />
              </Field>
            )}

            {type === 'ADJUSTMENT' && (
              <Field label="Reason">
                <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Stock count correction" />
              </Field>
            )}
          </CardBody>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link to="/movements">
            <Button type="button" variant="outlined">Cancel</Button>
          </Link>
          <Button type="submit" loading={mutation.isPending} icon="swap_vert" disabled={!batchId}>
            Record movement
          </Button>
        </div>
      </form>
    </div>
  )
}