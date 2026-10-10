import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Card, CardBody, CardHeader, ErrorBanner, Field, Input, LoadingScreen, PageHeader } from '@/components/ui'
import { useCreateProduct, useProduct, useUpdateProduct } from '@/lib/queries'
import { ApiError } from '@/lib/api'

interface FormState {
  name: string
  category: string
  strength: string
  dosageForm: string
  barcode: string
  pricePerUnit: string
  pricePerPacket: string
  packetSize: string
  unitLabel: string
  lowStockThreshold: string
  imageUrl: string
  requiresPrescription: boolean
  isControlled: boolean
  batchNumber: string
  expiryDate: string
  initialQuantity: string
}

const EMPTY: FormState = {
  name: '',
  category: '',
  strength: '',
  dosageForm: '',
  barcode: '',
  pricePerUnit: '',
  pricePerPacket: '',
  packetSize: '',
  unitLabel: 'unit',
  lowStockThreshold: '',
  imageUrl: '',
  requiresPrescription: false,
  isControlled: false,
  batchNumber: '',
  expiryDate: '',
  initialQuantity: '',
}

const clean = (value: string) => (value.trim() === '' ? null : value.trim())

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { data: existing, isLoading } = useProduct(id)

  const createMutation = useCreateProduct()
  const updateMutation = useUpdateProduct()

  const [form, setForm] = useState<FormState>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        category: existing.category ?? '',
        strength: existing.strength ?? '',
        dosageForm: existing.dosageForm ?? '',
        barcode: existing.barcode ?? '',
        pricePerUnit: existing.pricePerUnit ?? '',
        pricePerPacket: existing.pricePerPacket ?? '',
        packetSize: existing.packetSize != null ? String(existing.packetSize) : '',
        unitLabel: existing.unitLabel ?? 'unit',
        lowStockThreshold: existing.lowStockThreshold != null ? String(existing.lowStockThreshold) : '',
        imageUrl: existing.imageUrl ?? '',
        requiresPrescription: existing.requiresPrescription,
        isControlled: existing.isControlled,
        batchNumber: '',
        expiryDate: '',
        initialQuantity: '',
      })
    }
  }, [existing])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      category: clean(form.category),
      strength: clean(form.strength),
      dosageForm: clean(form.dosageForm),
      barcode: clean(form.barcode),
      pricePerUnit: clean(form.pricePerUnit),
      pricePerPacket: clean(form.pricePerPacket),
      packetSize: form.packetSize ? Number(form.packetSize) : null,
      unitLabel: form.unitLabel.trim() || 'unit',
      lowStockThreshold: form.lowStockThreshold ? Number(form.lowStockThreshold) : null,
      imageUrl: clean(form.imageUrl),
      requiresPrescription: form.requiresPrescription,
      isControlled: form.isControlled,
    }

    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, payload })
        navigate(`/inventory/${id}`)
      } else {
        payload.batchNumber = clean(form.batchNumber)
        payload.expiryDate = clean(form.expiryDate)
        payload.initialQuantity = form.initialQuantity ? Number(form.initialQuantity) : null
        const created = await createMutation.mutateAsync(payload)
        navigate(`/inventory/${created.data.id}`)
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else setError('Unable to save the product.')
    }
  }

  if (isEdit && isLoading) return <LoadingScreen />

  const saving = createMutation.isPending || updateMutation.isPending

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isEdit ? 'Edit product' : 'New product'}
        description={isEdit ? 'Update details, pricing and restocking threshold' : 'Add a product and an optional first batch'}
      />
      <Link to={isEdit && id ? `/inventory/${id}` : '/inventory'} className="text-body-sm font-semibold text-secondary hover:underline">
        ← Back
      </Link>

      <form onSubmit={onSubmit} className="mt-4 space-y-6" noValidate>
        <ErrorBanner message={error ?? undefined} />

        <Card>
          <CardHeader title="Product details" />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Product name" required className="sm:col-span-2">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="Paracétamol 500mg" />
            </Field>
            <Field label="Category">
              <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="Analgesics" />
            </Field>
            <Field label="Strength">
              <Input value={form.strength} onChange={(e) => set('strength', e.target.value)} placeholder="500mg" />
            </Field>
            <Field label="Dosage form">
              <Input value={form.dosageForm} onChange={(e) => set('dosageForm', e.target.value)} placeholder="Tablet" />
            </Field>
            <Field label="Barcode">
              <Input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="616110…" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pricing" />
          <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Unit price" hint="Numeric, e.g. 250">
              <Input inputMode="decimal" value={form.pricePerUnit} onChange={(e) => set('pricePerUnit', e.target.value)} placeholder="250" />
            </Field>
            <Field label="Packet price">
              <Input inputMode="decimal" value={form.pricePerPacket} onChange={(e) => set('pricePerPacket', e.target.value)} placeholder="2500" />
            </Field>
            <Field label="Units per packet">
              <Input type="number" min={1} value={form.packetSize} onChange={(e) => set('packetSize', e.target.value)} placeholder="10" />
            </Field>
            <Field label="Unit label" hint="What a single stock unit is called">
              <Input value={form.unitLabel} onChange={(e) => set('unitLabel', e.target.value)} placeholder="unit" />
            </Field>
            <Field label="Low-stock threshold" hint="Alert when stock is at or below">
              <Input type="number" min={0} value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value)} placeholder="20" />
            </Field>
            <Field label="Image URL">
              <Input value={form.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Regulatory" />
          <CardBody className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.requiresPrescription} onChange={(e) => set('requiresPrescription', e.target.checked)} className="h-4 w-4" />
              <span className="text-body-md text-on-surface">Requires a prescription</span>
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={form.isControlled} onChange={(e) => set('isControlled', e.target.checked)} className="h-4 w-4" />
              <span className="text-body-md text-on-surface">Controlled substance (Law 90/035)</span>
            </label>
          </CardBody>
        </Card>

        {!isEdit && (
          <Card>
            <CardHeader title="First batch" subtitle="Optional — record a received batch with initial stock" />
            <CardBody className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Batch number">
                <Input value={form.batchNumber} onChange={(e) => set('batchNumber', e.target.value)} placeholder="BATCH-001" />
              </Field>
              <Field label="Expiry date">
                <Input type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
              </Field>
              <Field label="Received quantity" hint="Creates a receipt movement">
                <Input type="number" min={1} value={form.initialQuantity} onChange={(e) => set('initialQuantity', e.target.value)} placeholder="100" />
              </Field>
            </CardBody>
          </Card>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link to={isEdit && id ? `/inventory/${id}` : '/inventory'}>
            <Button type="button" variant="outlined">Cancel</Button>
          </Link>
          <Button type="submit" loading={saving} icon="save">
            {isEdit ? 'Save changes' : 'Create product'}
          </Button>
        </div>
      </form>
    </div>
  )
}