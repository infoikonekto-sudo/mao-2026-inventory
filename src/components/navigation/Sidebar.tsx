import { User } from '@/types'
import { Menu, LogOut, Settings, LayoutDashboard, Package, UploadCloud, ArrowRightLeft, ClipboardList, ShoppingCart, FileText, PiggyBank, Zap, Building, Briefcase, Users, BarChart3, Truck, ShieldCheck, Link as LinkIcon, Component } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { ROLE_LABELS } from '@/constants'
import { getMenuItemsForRole } from '@/utils/permissions'
import { useNotificationsStore } from '@/stores/notificationsStore'

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
  user: User
  onLogout: () => void
}

export default function Sidebar({ isOpen, onToggle, user, onLogout }: SidebarProps) {
  const location = useLocation()
  const { pendingRequisitions } = useNotificationsStore()

  // Definir todos los items posibles con iconos de lucide
  const allMenuItems = [
    { label: 'Panel Principal', icon: LayoutDashboard, href: '/dashboard/', id: 'dashboard' },
    { label: 'Inventario', icon: Package, href: '/dashboard/inventory', id: 'inventory' },
    { label: 'Importar Inventario', icon: UploadCloud, href: '/dashboard/inventory-import', id: 'inventory-import' },
    { label: 'Movimientos', icon: ArrowRightLeft, href: '/dashboard/inventory-movements', id: 'inventory-movements' },
    { label: 'Requisiciones', icon: ClipboardList, href: '/dashboard/requisitions', id: 'requisitions' },
    { label: 'Solicitudes de Compra', icon: ShoppingCart, href: '/dashboard/purchase-requests', id: 'purchase-requests' },
    { label: 'Órdenes de Compra', icon: FileText, href: '/dashboard/purchase-orders', id: 'purchase-orders' },
    { label: 'Presupuestos', icon: PiggyBank, href: '/dashboard/budgets', id: 'budgets' },
    { label: 'Órdenes Express', icon: Zap, href: '/dashboard/express-orders', id: 'express-orders' },
    { label: 'Centros de Costo', icon: Building, href: '/dashboard/cost-centers', id: 'cost-centers' },
    { label: 'Proveedores', icon: Briefcase, href: '/dashboard/suppliers', id: 'suppliers' },
    { label: 'Usuarios', icon: Users, href: '/dashboard/users', id: 'users' },
    { label: 'Reportes', icon: BarChart3, href: '/dashboard/reports', id: 'reports' },
    { label: 'Entrega Express', icon: Truck, href: '/dashboard/ventanilla', id: 'ventanilla' },
    { label: 'Auditoría', icon: ShieldCheck, href: '/dashboard/audit', id: 'audit' },
    { label: 'Verificación de Conexiones', icon: LinkIcon, href: '/dashboard/verify-connections', id: 'verify-connections' },
    { label: 'Configuración', icon: Settings, href: '/dashboard/settings', id: 'settings' },
  ]

  // Filtrar según permisos del rol
  const allowedItemIds = getMenuItemsForRole(user)
  const menuItems = allMenuItems.filter(item => allowedItemIds.includes(item.id))

  return (
    <>
      {/* Sidebar Backdrop (Mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${isOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed lg:static lg:translate-x-0 inset-y-0 left-0 w-[280px] transition-transform duration-300 ease-in-out z-40 flex flex-col bg-[#F8FAFC] border-r border-gray-200 lg:z-0`}
      >
        {/* Logo Section */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1rem] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Component size={24} />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-gray-900 tracking-tight">MAO 2026</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Inventario</p>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="lg:hidden p-2 hover:bg-white rounded-[1rem] shadow-sm text-gray-500"
          >
            <Menu size={20} />
          </button>
        </div>

        {/* User Info Section */}
        <div className="px-6 pb-6">
          <div className="bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-xl shadow-gray-200/20">
            <div className="flex items-center gap-3 mb-4">
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={user.full_name}
                  className="w-12 h-12 rounded-[1rem] object-cover shadow-sm"
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-[1rem] flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-200">
                  {user.full_name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-gray-900 truncate">{user.full_name}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Cód. Acceso</span>
              <span className="text-xs font-black text-gray-700 font-mono bg-white px-2 py-1 rounded-md shadow-sm border border-gray-100">{user.auth_code}</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 pb-4 space-y-1.5 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="px-2 pb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Menú Principal</span>
          </div>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/dashboard/' && location.pathname.startsWith(item.href))
            const Icon = item.icon
            const isRequisitions = item.id === 'requisitions'
            const hasPending = isRequisitions && pendingRequisitions > 0

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all duration-200 ${
                  isActive 
                    ? 'bg-white text-blue-700 shadow-sm border border-gray-100' 
                    : hasPending
                      ? 'bg-cyan-100/50 shadow-[0_0_15px_rgba(0,255,255,0.4)] border border-cyan-400 text-cyan-700'
                      : 'text-gray-500 hover:bg-white/60 hover:text-gray-900'
                }`}
              >
                <div className={`${isActive ? 'text-blue-600' : hasPending ? 'text-cyan-600' : 'text-gray-400'}`}>
                  <Icon size={18} strokeWidth={isActive || hasPending ? 2.5 : 2} />
                </div>
                <span className="flex-1">{item.label}</span>
                {hasPending && (
                  <span className="bg-cyan-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                    {pendingRequisitions}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 space-y-1">
          <Link
            to="/dashboard/profile"
            className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-500 hover:bg-white hover:text-gray-900 rounded-2xl transition-all"
          >
            <Settings size={18} />
            <span>Perfil y Ajustes</span>
          </Link>
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
