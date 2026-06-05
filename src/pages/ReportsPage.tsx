import { useState } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download, Filter } from 'lucide-react'
import { Button } from '@/components/ui'

const reportsData = [
  { name: 'Inventario', date: '2026-01-15', items: 125, value: 'Q 487,250', format: 'PDF' },
  { name: 'Requisiciones', date: '2026-01-14', items: 45, value: 'Q 125,400', format: 'Excel' },
  { name: 'Órdenes', date: '2026-01-13', items: 28, value: 'Q 98,750', format: 'PDF' },
  { name: 'Gastos', date: '2026-01-12', items: 156, value: 'Q 542,800', format: 'Excel' },
  { name: 'Usuarios', date: '2026-01-11', items: 12, value: 'N/A', format: 'CSV' },
]

const monthlyData = [
  { month: 'Ene', presupuesto: 100000, gastado: 87500, requisiciones: 45 },
  { month: 'Feb', presupuesto: 100000, gastado: 92300, requisiciones: 52 },
  { month: 'Mar', presupuesto: 100000, gastado: 78400, requisiciones: 38 },
  { month: 'Abr', presupuesto: 100000, gastado: 105600, requisiciones: 61 },
  { month: 'May', presupuesto: 100000, gastado: 89200, requisiciones: 44 },
]

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('all')
  const [dateRange, setDateRange] = useState('month')

  return (
    <div className="space-y-6">
      {/* Encabezado con logo */}
      <div className="flex items-center gap-4 card p-6 bg-gradient-to-r from-blue-50 to-cyan-50">
        <img
          src="/logo-mao.png"
          alt="Logo MAO"
          className="w-16 h-16 object-contain"
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📊 Reportes</h1>
          <p className="text-gray-600">Análisis y reportes del sistema - MAO 2026</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 card p-4">
        <select value={selectedReport} onChange={(e) => setSelectedReport(e.target.value)} className="input-base">
          <option value="all">Todos los reportes</option>
          <option value="inventory">Inventario</option>
          <option value="requisitions">Requisiciones</option>
          <option value="orders">Órdenes</option>
          <option value="expenses">Gastos</option>
        </select>

        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="input-base">
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
          <option value="quarter">Este trimestre</option>
          <option value="year">Este año</option>
        </select>

        <Button variant="secondary">
          <Filter size={20} className="mr-2" />
          Más filtros
        </Button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Gastos vs Presupuesto</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="presupuesto" fill="#1E40AF" />
              <Bar dataKey="gastado" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Requisiciones</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="requisiciones" stroke="#F59E0B" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Reportes Recientes</h3>
          <Button variant="primary" size="sm">
            <Download size={18} className="mr-1" />
            Generar Nuevo
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Elementos</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Valor</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Formato</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportsData.map((report, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{report.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{report.date}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{report.items}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{report.value}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">{report.format}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button className="text-primary hover:underline flex items-center gap-1">
                      <Download size={16} />
                      Descargar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary">156</p>
          <p className="text-xs text-gray-600">Total Reportes</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-success">45</p>
          <p className="text-xs text-gray-600">Este Mes</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-warning">12</p>
          <p className="text-xs text-gray-600">Pendientes</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-info">3.8</p>
          <p className="text-xs text-gray-600">GB Almacenados</p>
        </div>
      </div>
    </div>
  )
}
