import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './api'
import type {
  Batch,
  DashboardData,
  ListMeta,
  LossReport,
  Movement,
  Product,
  User,
  Pharmacy,
} from './types'

interface ListResult<T> {
  data: T[]
  meta: ListMeta
}

export interface ProductQuery {
  q?: string
  page?: number
  pageSize?: number
  pharmacyId?: string
}

export function useProducts(query: ProductQuery = {}) {
  return useQuery({
    queryKey: ['products', query],
    queryFn: () =>
      api.get<Product[]>('/products', { query: query as Record<string, string | number> }).then(
        (r) => ({ data: r.data, meta: r.meta }) as ListResult<Product>,
      ),
  })
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['product', id],
    enabled: Boolean(id),
    queryFn: () => api.get<Product>(`/products/${id}`).then((r) => r.data),
  })
}

export function useBatches(productId: string | undefined, pharmacyId?: string) {
  return useQuery({
    queryKey: ['batches', productId, pharmacyId],
    enabled: Boolean(productId),
    queryFn: () =>
      api
        .get<Batch[]>(`/products/${productId}/batches`, {
          query: pharmacyId ? { pharmacyId } : undefined,
        })
        .then((r) => r.data),
  })
}

export interface MovementListParams {
  page?: number
  pageSize?: number
  type?: string
  productId?: string
  batchId?: string
  pharmacyId?: string
}

export function useMovements(params: MovementListParams = {}) {
  return useQuery({
    queryKey: ['movements', params],
    queryFn: () =>
      api
        .get<Movement[]>('/movements', { query: params as Record<string, string | number> })
        .then((r) => ({ data: r.data, meta: r.meta }) as ListResult<Movement>),
  })
}

export function useLossReports(params: { page?: number; pageSize?: number; unreportedOnly?: boolean } = {}) {
  return useQuery({
    queryKey: ['loss-reports', params],
    queryFn: () =>
      api
        .get<LossReport[]>('/loss-reports', {
          query: params as Record<string, string | number | boolean>,
        })
        .then((r) => ({ data: r.data, meta: r.meta }) as ListResult<LossReport>),
  })
}

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardData>('/reports/dashboard').then((r) => r.data),
  })
}

export interface PharmacyListParams {
  page?: number
  pageSize?: number
  status?: string
}

export function usePharmacies(params: PharmacyListParams = {}) {
  return useQuery({
    queryKey: ['admin-pharmacies', params],
    queryFn: () =>
      api
        .get<Pharmacy[]>('/admin/pharmacies', { query: params as Record<string, string | number> })
        .then((r) => ({ data: r.data, meta: r.meta }) as ListResult<Pharmacy>),
  })
}

export function useUsers(params: { page?: number; pageSize?: number; role?: string } = {}) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: () =>
      api
        .get<User[]>('/users', { query: params as Record<string, string | number> })
        .then((r) => ({ data: r.data, meta: r.meta }) as ListResult<User>),
  })
}

const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
  void queryClient.invalidateQueries({ queryKey: ['products'] })
  void queryClient.invalidateQueries({ queryKey: ['movements'] })
  void queryClient.invalidateQueries({ queryKey: ['loss-reports'] })
  void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  void queryClient.invalidateQueries({ queryKey: ['product'] })
  void queryClient.invalidateQueries({ queryKey: ['batches'] })
  void queryClient.invalidateQueries({ queryKey: ['admin-pharmacies'] })
  void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<Product>('/products', payload),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.patch<Product>(`/products/${id}`, payload),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCreateBatch(productId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<Batch>(`/products/${productId}/batches`, payload),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      api.patch<Batch>(`/batches/${id}`, payload),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCreateMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<{ id: string; newBatchStock: number }>('/movements', payload),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useMarkLossReported() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, authorityReference }: { id: string; authorityReference?: string }) =>
      api.patch<LossReport>(`/loss-reports/${id}/reported`, { authorityReference }),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useProvisionPharmacy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<unknown>('/admin/pharmacies', payload),
    onSuccess: () => invalidateAll(qc),
  })
}

export function usePharmacyStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<unknown>(`/admin/pharmacies/${id}/status`, { status }),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeletePharmacy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/admin/pharmacies/${id}`),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.post<User>('/users', payload),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<unknown>(`/users/${id}`),
    onSuccess: () => invalidateAll(qc),
  })
}