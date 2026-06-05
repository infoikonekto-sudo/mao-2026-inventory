import { useState } from 'react'
import { useNavigate, Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Sidebar from '@/components/navigation/Sidebar'
import TopBar from '@/components/navigation/TopBar'
import ProtectedRoute from '@/components/ProtectedRoute'
import AdminDashboard from '@/pages/dashboards/AdminDashboard'
import ProfessorDashboard from '@/pages/dashboards/ProfessorDashboard'
import InventoryPage from '@/pages/InventoryPage'
import InventoryImportPage from '@/pages/InventoryImportPage'
import InventoryMovementsPage from '@/pages/InventoryMovementsPage'
import RequisitionsPage from '@/pages/RequisitionsPage'
import PurchaseRequestsPage from '@/pages/PurchaseRequestsPage'
import PurchaseOrdersPage from '@/pages/PurchaseOrdersPage'
import SuppliersPage from '@/pages/SuppliersPage'
import BudgetsPage from '@/pages/BudgetsPage'
import UsersManagementPage from '@/pages/UsersManagementPage'
import ProfessionalReportsPage from '@/pages/ProfessionalReportsPage'
import AuditPage from '@/pages/AuditPage'
import SettingsPage from '@/pages/SettingsPage'
import ProfilePage from '@/pages/ProfilePage'
import ConnectionVerificationPage from '@/pages/ConnectionVerificationPage'
import WindowDeliveryPage from '@/pages/WindowDeliveryPage'
import CostCentersPage from '@/pages/CostCentersPage'
import ExpressOrdersPage from '@/pages/ExpressOrdersPage'
import CreateExpressOrderPage from '@/pages/CreateExpressOrderPage'
import ExpressOrderDetailPage from '@/pages/ExpressOrderDetailPage'
import ChiefsDashboard from '@/pages/dashboards/ChiefsDashboard'

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  if (!user) {
    navigate('/')
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <TopBar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          user={user}
        />

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            <Routes>
              import ChiefsDashboard from '@/pages/dashboards/ChiefsDashboard'

              // ...

              <Route
                path="/"
                element={
                  <ProtectedRoute user={user} route="/dashboard/" pageName="Dashboard">
                    {user.role === 'profesor' ? <ProfessorDashboard /> :
                      ['jefe_presupuesto', 'jefe_operaciones', 'jefe_calidad'].includes(user.role) ? <ChiefsDashboard /> :
                        <AdminDashboard />}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute user={user} route="/dashboard" pageName="Dashboard">
                    {user.role === 'profesor' ? <ProfessorDashboard /> :
                      ['jefe_presupuesto', 'jefe_operaciones', 'jefe_calidad'].includes(user.role) ? <ChiefsDashboard /> :
                        <AdminDashboard />}
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedRoute user={user} route="/dashboard/inventory" pageName="Inventario">
                    <InventoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory-import"
                element={
                  <ProtectedRoute user={user} route="/dashboard/inventory-import" pageName="Importar Inventario">
                    <InventoryImportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventory-movements"
                element={
                  <ProtectedRoute user={user} route="/dashboard/inventory-movements" pageName="Movimientos de Inventario">
                    <InventoryMovementsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/requisitions"
                element={
                  <ProtectedRoute user={user} route="/dashboard/requisitions" pageName="Requisiciones">
                    <RequisitionsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchase-requests"
                element={
                  <ProtectedRoute user={user} route="/dashboard/purchase-requests" pageName="Solicitudes de Compra">
                    <PurchaseRequestsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/purchase-orders"
                element={
                  <ProtectedRoute user={user} route="/dashboard/purchase-orders" pageName="Órdenes de Compra">
                    <PurchaseOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/budgets"
                element={
                  <ProtectedRoute user={user} route="/dashboard/budgets" pageName="Presupuestos">
                    <BudgetsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/suppliers"
                element={
                  <ProtectedRoute user={user} route="/dashboard/suppliers" pageName="Proveedores">
                    <SuppliersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute user={user} route="/dashboard/users" pageName="Gestión de Usuarios">
                    <UsersManagementPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute user={user} route="/dashboard/reports" pageName="Reportes Profesionales">
                    <ProfessionalReportsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <ProtectedRoute user={user} route="/dashboard/audit" pageName="Auditoría">
                    <AuditPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cost-centers"
                element={
                  <ProtectedRoute user={user} route="/dashboard/cost-centers" pageName="Centros de Costo">
                    <CostCentersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ventanilla"
                element={
                  <ProtectedRoute user={user} route="/dashboard/ventanilla" pageName="Entrega en Ventanilla">
                    <WindowDeliveryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute user={user} route="/dashboard/settings" pageName="Configuración">
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute user={user} route="/dashboard/profile" pageName="Mi Perfil">
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/verify-connections"
                element={
                  <ProtectedRoute user={user} route="/dashboard/verify-connections" pageName="Verificación de Conexiones">
                    <ConnectionVerificationPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/express-orders"
                element={
                  <ProtectedRoute user={user} route="/dashboard/express-orders" pageName="Órdenes Express">
                    <ExpressOrdersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/express-orders/new"
                element={
                  <ProtectedRoute user={user} route="/dashboard/express-orders/new" pageName="Nueva Orden Express">
                    <CreateExpressOrderPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/express-orders/:id"
                element={
                  <ProtectedRoute user={user} route="/dashboard/express-orders/:id" pageName="Detalle Orden Express">
                    <ExpressOrderDetailPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </main>
      </div >
    </div >
  )
}
