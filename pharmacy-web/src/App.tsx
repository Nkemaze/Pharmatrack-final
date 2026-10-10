import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/Layout'
import { RequireAdmin, RequireAuth } from '@/components/Guards'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { AdminSetupPage } from '@/pages/AdminSetupPage'
import { ProfileSetupPage } from '@/pages/ProfileSetupPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { InventoryPage } from '@/pages/InventoryPage'
import { ProductDetailPage } from '@/pages/ProductDetailPage'
import { ProductFormPage } from '@/pages/ProductFormPage'
import { MovementsPage } from '@/pages/MovementsPage'
import { RecordMovementPage } from '@/pages/RecordMovementPage'
import { LossReportsPage } from '@/pages/LossReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { AdminPharmaciesPage } from '@/pages/admin/AdminPharmaciesPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/setup-admin" element={<AdminSetupPage />} />

      <Route
        path="/profile-setup"
        element={
          <RequireAuth>
            <ProfileSetupPage />
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/new" element={<ProductFormPage />} />
        <Route path="/inventory/:id" element={<ProductDetailPage />} />
        <Route path="/inventory/:id/edit" element={<ProductFormPage />} />
        <Route path="/movements" element={<MovementsPage />} />
        <Route path="/movements/new" element={<RecordMovementPage />} />
        <Route path="/loss-reports" element={<LossReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route path="/admin" element={<Navigate to="/admin/pharmacies" replace />} />
        <Route
          path="/admin/pharmacies"
          element={
            <RequireAdmin>
              <AdminPharmaciesPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAdmin>
              <AdminUsersPage />
            </RequireAdmin>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}