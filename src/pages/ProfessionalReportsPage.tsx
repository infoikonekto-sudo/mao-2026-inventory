import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import html2canvas from 'html2canvas'
import { FileText, BarChart3, TrendingUp, AlertTriangle, CheckCircle, Package, Building2, ListChecks, ArrowRight, History, BookOpen, Database, Calendar } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/services/supabaseClient'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui'

interface ReportData {
  requisitions?: any[]
  requests?: any[]
  orders?: any[]
  inventory?: any[]
  costCenters?: any[]
  movements?: any[]
  suppliers?: any[]
  summary?: {
    totalSpent: number
    totalWarehouseValue?: number
    movementCount?: number
    pendingApprovals: number
    lowStockItems: number
    budgetUsage: any[]
    monthlyTrends: any[]
    movementStats?: {
      totalEntries: number
      totalExits: number
      netBalance: number
      topItem: string
      topDept: string
      totalValue: number
    }
  }
}

// Branding Colors for future charts
// const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#14b8a6', '#f43f5e', '#a855f7']

const REPORT_CATEGORIES = [
  {
    id: 'purchases',
    label: 'Gestión de Compras',
    icon: <Package size={18} />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    reports: [
      { id: 'orders', label: 'Órdenes de Compra', icon: '📦' },
      { id: 'requests', label: 'Solicitudes de Compra', icon: '✉️' },
      { id: 'cost-centers', label: 'Centros de Costo', icon: '🏢' },
    ]
  },
  {
    id: 'requisitions',
    label: 'Requisiciones y Demanda',
    icon: <History size={18} />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    reports: [
      { id: 'requisitions', label: 'Historial de Requisiciones', icon: '📋' },
      { id: 'exits', label: 'Egresos de Inventario', icon: '📤' },
    ]
  },
  {
    id: 'inventory_suppliers',
    label: 'Inventario y Proveedores',
    icon: <BookOpen size={18} />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    reports: [
      { id: 'inventory', label: 'Stock Actual y Valorización', icon: '📚' },
      { id: 'entries', label: 'Ingresos de Inventario', icon: '📥' },
      { id: 'abc', label: 'Análisis ABC', icon: '📊' },
      { id: 'suppliers', label: 'Directorio de Proveedores', icon: '🤝' },
    ]
  }
]

export default function ProfessionalReportsPage() {
  const navigate = useNavigate()
  const { user, license } = useAuthStore()
  const [reportType, setReportType] = useState<'dashboard' | 'requisitions' | 'requests' | 'orders' | 'inventory' | 'cost-centers' | 'dash-movements' | 'entries' | 'exits' | 'trends' | 'abc' | 'suppliers'>('orders')
  const [reportData, setReportData] = useState<ReportData>({})
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // Date filters
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Cost center and Department filters
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('')
  const [allCostCenters, setAllCostCenters] = useState<any[]>([])
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [allDepartments, setAllDepartments] = useState<any[]>([])

  useEffect(() => {
    loadCostCenters()
    loadDepartments()
  }, [])

  useEffect(() => {
    loadReportData()
  }, [reportType, startDate, endDate, selectedCostCenter, selectedDepartment])

  const loadDepartments = async () => {
    try {
      const { data } = await supabase
        .from('departments')
        .select('*')
        .order('name')
      setAllDepartments(data || [])
    } catch (error) {
      console.error('Error loading departments:', error)
    }
  }

  const loadCostCenters = async () => {
    try {
      if (!license?.id) return
      const { data } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('license_id', license.id)
        .eq('is_active', true)
        .order('name')
      setAllCostCenters(data || [])
    } catch (error) {
      console.error('Error loading cost centers:', error)
    }
  }

  const loadReportData = async () => {
    try {
      setLoading(true)
      if (!license?.id) return

      const data: ReportData = {}

      if (reportType === 'dashboard') {
        // Carga masiva para el resumen ejecutivo
        const [ordersRes, requestsRes, itemsRes, centersRes, movementsRes] = await Promise.all([
          supabase.from('purchase_orders').select('*').eq('license_id', license.id),
          supabase.from('purchase_requests').select('*', { count: 'exact' }).eq('license_id', license.id).eq('status', 'pendiente'),
          supabase.from('inventory_items').select('*').eq('license_id', license.id),
          supabase.from('cost_centers').select('*').eq('license_id', license.id).eq('is_active', true),
          supabase.from('inventory_movements').select('*', { count: 'exact' }).eq('license_id', license.id).limit(1)
        ])

        const orders = ordersRes.data || []
        const items = itemsRes.data || []
        const totalSpent = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        const lowStock = items.filter(i => (i.current_stock || 0) <= (i.minimum_stock || 0)).length
        const totalWarehouseValue = items.reduce((sum, i) => sum + ((i.current_stock || 0) * (i.unit_cost || 0)), 0)

        // Tendencia mensual (últimos 6 meses)
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        const trends = orders.reduce((acc: any[], order) => {
          const date = new Date(order.created_at)
          const monthLabel = months[date.getMonth()]
          const existing = acc.find(m => m.name === monthLabel)
          if (existing) {
            existing.total += (order.total_amount || 0)
          } else {
            acc.push({ name: monthLabel, total: (order.total_amount || 0) })
          }
          return acc
        }, []).slice(-6)

        // Uso de presupuesto por centro de costo
        const budgetUsage = (centersRes.data || []).map(cc => {
          const ccOrders = orders.filter(o => o.cost_center_id === cc.id)
          const spent = ccOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
          return {
            name: cc.name,
            asignado: cc.budget_allocated,
            ejecutado: spent
          }
        }).sort((a, b) => b.ejecutado - a.ejecutado).slice(0, 5)

        data.summary = {
          totalSpent,
          totalWarehouseValue, // NEW
          movementCount: movementsRes.count || 0, // NEW
          pendingApprovals: requestsRes.count || 0,
          lowStockItems: lowStock,
          budgetUsage,
          monthlyTrends: trends
        }

      } else if (reportType === 'requisitions') {
        let query = supabase
          .from('requisitions')
          .select('*')
          .eq('license_id', license.id)

        if (startDate) query = query.gte('created_at', new Date(startDate).toISOString())
        if (endDate) query = query.lte('created_at', new Date(endDate + 'T23:59:59').toISOString())
        if (selectedCostCenter) query = query.eq('cost_center_id', selectedCostCenter)
        if (selectedDepartment) query = query.eq('department_id', selectedDepartment)

        const { data: reqs } = await query.order('created_at', { ascending: false })

        // Map related data
        if (reqs && reqs.length > 0) {
          const ccIds = [...new Set(reqs.map(r => r.cost_center_id).filter(Boolean))]
          const { data: ccs } = await supabase.from('cost_centers').select('id, name').in('id', ccIds)
          const ccMap = new Map(ccs?.map(c => [c.id, c]) || [])
          reqs.forEach(r => {
            if (r.cost_center_id) r.cost_centers = ccMap.get(r.cost_center_id)
          })
        }
        data.requisitions = reqs || []
      } else if (reportType === 'requests') {
        let query = supabase
          .from('purchase_requests')
          .select('*')
          .eq('license_id', license.id)

        if (startDate) query = query.gte('created_at', new Date(startDate).toISOString())
        if (endDate) query = query.lte('created_at', new Date(endDate + 'T23:59:59').toISOString())
        if (selectedCostCenter) query = query.eq('cost_center_id', selectedCostCenter)
        if (selectedDepartment) query = query.eq('department_id', selectedDepartment)

        const { data: reqs } = await query.order('created_at', { ascending: false })

        // Map related data
        if (reqs && reqs.length > 0) {
          const ccIds = [...new Set(reqs.map(r => r.cost_center_id).filter(Boolean))]
          const { data: ccs } = await supabase.from('cost_centers').select('id, name').in('id', ccIds)
          const ccMap = new Map(ccs?.map(c => [c.id, c]) || [])
          reqs.forEach(r => {
            if (r.cost_center_id) r.cost_centers = ccMap.get(r.cost_center_id)
          })
        }
        data.requests = reqs || []
      } else if (reportType === 'orders') {
        let query = supabase
          .from('purchase_orders')
          .select('*')
          .eq('license_id', license.id)

        if (startDate) query = query.gte('created_at', new Date(startDate).toISOString())
        if (endDate) query = query.lte('created_at', new Date(endDate + 'T23:59:59').toISOString())
        if (selectedCostCenter) query = query.eq('cost_center_id', selectedCostCenter)
        if (selectedDepartment) query = query.eq('department_id', selectedDepartment)

        const { data: orders } = await query.order('created_at', { ascending: false })

        // Map related data
        if (orders && orders.length > 0) {
          const sIds = [...new Set(orders.map(o => o.supplier_id).filter(Boolean))]
          const ccIds = [...new Set(orders.map(o => o.cost_center_id).filter(Boolean))]

          const [suppliersRes, centersRes] = await Promise.all([
            supabase.from('suppliers').select('id, name').in('id', sIds),
            supabase.from('cost_centers').select('id, name').in('id', ccIds)
          ])

          const sMap = new Map(suppliersRes.data?.map(s => [s.id, s]) || [])
          const ccMap = new Map(centersRes.data?.map(c => [c.id, c]) || [])

          orders.forEach(o => {
            if (o.supplier_id) o.suppliers = sMap.get(o.supplier_id)
            if (o.cost_center_id) o.cost_centers = ccMap.get(o.cost_center_id)
          })
        }
        data.orders = orders || []
      } else if (reportType === 'inventory') {
        const { data: items } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('license_id', license.id)
          .order('name', { ascending: true })
        data.inventory = items || []
      } else if (reportType === 'suppliers') {
        const { data: suppliers } = await supabase
          .from('suppliers')
          .select('*')
          .eq('license_id', license.id)
          .order('name', { ascending: true })
        data.suppliers = suppliers || []
      } else if (reportType === 'cost-centers') {
        // Load cost centers
        let centersQuery = supabase
          .from('cost_centers')
          .select('*')
          .eq('license_id', license.id)
          .eq('is_active', true)

        if (selectedCostCenter) {
          centersQuery = centersQuery.eq('id', selectedCostCenter)
        }

        const { data: centers } = await centersQuery.order('name')

        if (centers && centers.length > 0) {
          // Fetch budgets separately to avoid joins
          const budgetIds = [...new Set(centers.map(c => c.budget_id).filter(Boolean))]
          const { data: budgets } = await supabase.from('budgets').select('id, name').in('id', budgetIds)
          const budgetMap = new Map(budgets?.map(b => [b.id, b]) || [])

          const costCentersWithOrders = await Promise.all(
            centers.map(async (center) => {
              let query = supabase
                .from('purchase_orders')
                .select('*')
                .eq('cost_center_id', center.id)

              if (startDate) query = query.gte('created_at', new Date(startDate).toISOString())
              if (endDate) query = query.lte('created_at', new Date(endDate + 'T23:59:59').toISOString())

              const { data: orders } = await query.order('created_at', { ascending: false })
              const total = (orders || []).reduce((sum, o) => sum + (o.total_amount || 0), 0)

              return {
                ...center,
                budgets: center.budget_id ? budgetMap.get(center.budget_id) : null,
                orders: orders || [],
                ordersCount: (orders || []).length,
                totalAmount: total
              }
            })
          )
          data.costCenters = costCentersWithOrders
        } else {
          data.costCenters = []
        }
      } else if (['dash-movements', 'entries', 'exits', 'trends', 'abc'].includes(reportType)) {
        // Core loading for all movement-based reports
        let query = supabase
          .from('inventory_movements')
          .select('*')
          .eq('license_id', license.id)

        if (startDate) query = query.gte('created_at', new Date(startDate).toISOString())
        if (endDate) query = query.lte('created_at', new Date(endDate + 'T23:59:59').toISOString())

        const [{ data: movements }, { data: items }] = await Promise.all([
          query.order('created_at', { ascending: false }),
          supabase.from('inventory_items').select('*').eq('license_id', license.id)
        ])

        const itemMap = new Map(items?.map(i => [i.id, i]) || [])
        
        const userIds = [...new Set((movements || []).map(m => m.user_id).filter(Boolean))]
        const { data: usersData } = await supabase.from('users').select('id, full_name').in('id', userIds)
        const userMap = new Map((usersData || []).map(u => [u.id, u]))

        const movementsWithDetails = (movements || []).map(m => ({
          ...m,
          items: itemMap.get(m.item_id),
          user: userMap.get(m.user_id)
        }))

        let finalMovements = movementsWithDetails

        if (reportType === 'exits') {
          const reqIds = finalMovements.filter(m => m.related_type === 'requisition').map(m => m.related_id).filter(Boolean)
          const expressIds = finalMovements.filter(m => m.related_type === 'express_order').map(m => m.related_id).filter(Boolean)

          const [reqRes, expressRes] = await Promise.all([
            reqIds.length ? supabase.from('requisitions').select('id, department_id, cost_center_id').in('id', reqIds) : { data: [] },
            expressIds.length ? supabase.from('express_orders').select('id, department_id, cost_center_id').in('id', expressIds) : { data: [] }
          ])

          const reqMap = new Map((reqRes.data || []).map((r:any) => [r.id, r]))
          const expressMap = new Map((expressRes.data || []).map((e:any) => [e.id, e]))

          finalMovements = finalMovements.map(m => {
            let areaInfo = null
            if (m.related_type === 'requisition') areaInfo = reqMap.get(m.related_id)
            if (m.related_type === 'express_order') areaInfo = expressMap.get(m.related_id)
            return { ...m, areaInfo }
          })

          if (selectedCostCenter || selectedDepartment) {
            finalMovements = finalMovements.filter(m => {
              if (!m.areaInfo) return !selectedCostCenter && !selectedDepartment
              return (!selectedCostCenter || m.areaInfo.cost_center_id === selectedCostCenter) &&
                     (!selectedDepartment || m.areaInfo.department_id === selectedDepartment)
            })
          }
        }

        data.movements = finalMovements
        data.inventory = items || []

        if (reportType === 'dash-movements') {
          const entries = movementsWithDetails.filter(m => m.type === 'entrada')
          const exits = movementsWithDetails.filter(m => m.type === 'salida' || m.type === 'requisicion')

          const totalEntries = entries.reduce((sum, m) => sum + (m.change || 0), 0)
          const totalExits = exits.reduce((sum, m) => sum + (m.change || 0), 0)
          const totalValue = movementsWithDetails.reduce((sum, m) => {
            const cost = m.items?.unit_cost || 0
            return sum + (m.change * cost)
          }, 0)

          // Top Item
          const itemCounts = exits.reduce((acc: any, m) => {
            const name = m.items?.name || 'Desconocido'
            acc[name] = (acc[name] || 0) + m.change
            return acc
          }, {})
          const topItem = Object.entries(itemCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || 'N/A'

          // Top Dept (Active Cost Center)
          let topDept = 'N/A'
          const requisitionIds = exits.filter(m => m.related_type === 'requisition').map(m => m.related_id).filter(Boolean)
          if (requisitionIds.length > 0) {
            const { data: reqs } = await supabase.from('requisitions').select('cost_center_id').in('id', requisitionIds)
            if (reqs && reqs.length > 0) {
              const ccCounts = reqs.reduce((acc: any, r) => {
                if (r.cost_center_id) acc[r.cost_center_id] = (acc[r.cost_center_id] || 0) + 1
                return acc
              }, {})
              const topCCId = Object.entries(ccCounts).sort((a: any, b: any) => b[1] - a[1])[0]?.[0]
              if (topCCId) {
                const topCC = allCostCenters.find(cc => cc.id === topCCId)
                if (topCC) topDept = topCC.name
              }
            }
          }

          data.summary = {
            ...data.summary,
            totalSpent: data.summary?.totalSpent || 0,
            pendingApprovals: data.summary?.pendingApprovals || 0,
            lowStockItems: data.summary?.lowStockItems || 0,
            budgetUsage: data.summary?.budgetUsage || [],
            monthlyTrends: data.summary?.monthlyTrends || [],
            movementStats: {
              totalEntries,
              totalExits,
              netBalance: totalEntries - totalExits,
              topItem,
              topDept,
              totalValue
            }
          }
        }

        if (reportType === 'abc') {
          const itemValueMap = movementsWithDetails
            .filter(m => m.type === 'salida' || m.type === 'requisicion')
            .reduce((acc: any, m) => {
              const id = m.item_id
              const value = (m.change || 0) * (m.items?.unit_cost || 0)
              acc[id] = (acc[id] || 0) + value
              return acc
            }, {})

          const sortedItems = items
            ?.map(i => ({
              ...i,
              totalValue: itemValueMap[i.id] || 0
            }))
            .sort((a, b) => b.totalValue - a.totalValue) || []

          const totalInventoryValue = sortedItems.reduce((sum, i) => sum + i.totalValue, 0)
          let cumulativeValue = 0

          const abcItems = sortedItems.map(item => {
            cumulativeValue += item.totalValue
            const percentage = (cumulativeValue / totalInventoryValue) * 100
            let classification: 'A' | 'B' | 'C' = 'C'
            if (percentage <= 80) classification = 'A'
            else if (percentage <= 95) classification = 'B'

            return { ...item, cumulativePercentage: percentage, classification }
          })

          data.movements = abcItems // Reusing movements slot for ABC items to simplify UI
        }

        if (reportType === 'trends') {
          // Prepare flow data for Recharts (entries vs exits)
          const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date()
            d.setDate(d.getDate() - (6 - i))
            return d.toISOString().split('T')[0]
          })

          const flowData = last7Days.map(date => {
            const dayMovements = movementsWithDetails.filter(m => m.created_at.startsWith(date))
            const entries = dayMovements.filter(m => m.type === 'entrada').reduce((sum, m) => sum + (m.change || 0), 0)
            const exits = dayMovements.filter(m => m.type === 'salida' || m.type === 'requisicion').reduce((sum, m) => sum + (m.change || 0), 0)
            return { name: date.split('-').slice(1, 3).reverse().join('/'), entries, exits }
          })

          data.summary = {
            ...data.summary,
            totalSpent: data.summary?.totalSpent || 0,
            pendingApprovals: data.summary?.pendingApprovals || 0,
            lowStockItems: data.summary?.lowStockItems || 0,
            budgetUsage: data.summary?.budgetUsage || [],
            monthlyTrends: flowData // Reusing field name for the trend chart
          }
        }
      }

      setReportData(data)
    } catch (error) {
      console.error('Error loading report data:', error)
      toast.error('Error cargando datos del reporte')
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = async () => {
    try {
      setExporting(true)

      const hasData = (reportType === 'dashboard' && reportData.summary) ||
        (reportType === 'dash-movements' && reportData.summary?.movementStats) ||
        (reportType === 'entries' && reportData.movements?.length! > 0) ||
        (reportType === 'exits' && reportData.movements?.length! > 0) ||
        (reportType === 'abc' && reportData.movements?.length! > 0) ||
        (reportType === 'trends' && reportData.summary?.monthlyTrends) ||
        (reportType === 'requisitions' && reportData.requisitions?.length! > 0) ||
        (reportType === 'requests' && reportData.requests?.length! > 0) ||
        (reportType === 'orders' && reportData.orders?.length! > 0) ||
        (reportType === 'inventory' && reportData.inventory?.length! > 0) ||
        (reportType === 'cost-centers' && reportData.costCenters?.length! > 0) ||
        (reportType === 'suppliers' && reportData.suppliers?.length! > 0);

      if (!hasData) {
        toast.error('No hay datos para exportar en el período seleccionado');
        setExporting(false);
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4')

      // Helper function to capture and add charts
      const addChartToPDF = async (id: string, y: number): Promise<number> => {
        const element = document.getElementById(id);
        if (element) {
          try {
            const canvas = await html2canvas(element, {
              scale: 2,
              logging: false,
              useCORS: true,
              backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth() - 40;
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            // Check if we need a new page
            if (y + pdfHeight > pdf.internal.pageSize.getHeight() - 20) {
              pdf.addPage();
              y = 20;
            }

            pdf.addImage(imgData, 'PNG', 20, y, pdfWidth, pdfHeight);
            return y + pdfHeight + 10;
          } catch (e) {
            console.error(`Error capturing chart ${id}:`, e);
            return y;
          }
        }
        return y;
      };

      // Encabezado
      pdf.setFontSize(18)
      pdf.setTextColor(0, 102, 204)
      pdf.text('MAO 2026', 20, 18)

      pdf.setFontSize(16)
      pdf.setTextColor(0, 0, 0)
      pdf.text('REPORTE OPERACIONAL MAESTRO', 20, 28)

      pdf.setFontSize(10)
      const reportTypeLabel =
        reportType === 'requisitions' ? 'Requisiciones' :
          reportType === 'requests' ? 'Solicitudes' :
            reportType === 'orders' ? 'Órdenes' :
              reportType === 'cost-centers' ? 'Centros de Costo' :
                reportType === 'dash-movements' ? 'Análisis de Movimientos' :
                  reportType === 'entries' ? 'Entradas de Inventario' :
                    reportType === 'exits' ? 'Salidas de Inventario' :
                      reportType === 'abc' ? 'Clasificación ABC' :
                        reportType === 'trends' ? 'Tendencias de Consumo' : 'Inventario'
      pdf.text(`Tipo: ${reportTypeLabel} `, 20, 35)
      pdf.text(`Fecha: ${new Date().toLocaleDateString('es-CO')} `, 20, 41)
      pdf.text(`Usuario: ${user?.full_name || 'Sistema'} `, 20, 47)
      if (startDate || endDate) {
        pdf.text(`Período: ${startDate || 'Inicio'} - ${endDate || 'Hoy'} `, 20, 53)
      }

      // Contenido del PDF
      let yPos = 65
      pdf.setFontSize(12)
      pdf.setTextColor(0, 0, 0)

      if (reportType === 'dashboard' && reportData.summary) {
        pdf.setFont('helvetica', 'bold')
        pdf.text('RESUMEN EJECUTIVO', 20, yPos)
        yPos += 10
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.text(`Gasto Total: Q ${reportData.summary.totalSpent.toLocaleString()} `, 25, yPos)
        yPos += 7
        pdf.text(`Pendientes de Aprobación: ${reportData.summary.pendingApprovals} `, 25, yPos)
        yPos += 7
        pdf.text(`Items en Stock Bajo: ${reportData.summary.lowStockItems} `, 25, yPos)
        yPos += 12

        // Capture Executive Charts
        pdf.setFont('helvetica', 'bold')
        pdf.text('VISUALIZACIÓN DE TENDENCIAS Y PRESUPUESTO', 20, yPos)
        yPos += 10
        yPos = await addChartToPDF('chart-budget-usage', yPos);
        yPos = await addChartToPDF('chart-monthly-trends', yPos);

      } else if (reportType === 'dash-movements' && reportData.summary?.movementStats) {
        pdf.setFont('helvetica', 'bold')
        pdf.text('RESUMEN DE MOVIMIENTOS', 20, yPos)
        yPos += 10

        // Capture Movement KPIs
        yPos = await addChartToPDF('movement-kpi-cards', yPos);

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.text(`Total Entradas: ${reportData.summary.movementStats.totalEntries} `, 25, yPos)
        yPos += 7
        pdf.text(`Total Salidas: ${reportData.summary.movementStats.totalExits} `, 25, yPos)
        yPos += 7
        pdf.text(`Balance Neto: ${reportData.summary.movementStats.netBalance} `, 25, yPos)
        yPos += 7
        pdf.text(`Valor Movilizado: Q ${reportData.summary.movementStats.totalValue.toLocaleString()} `, 25, yPos)
        yPos += 12
        pdf.text(`Artículo de Alta Rotación: ${reportData.summary.movementStats.topItem} `, 25, yPos)
      } else if (reportType === 'trends' && reportData.summary?.monthlyTrends) {
        pdf.setFont('helvetica', 'bold')
        pdf.text('ANÁLISIS DE TENDENCIAS Y FLUJO', 20, yPos)
        yPos += 10
        yPos = await addChartToPDF('chart-inventory-flow', yPos);
      } else if (reportType === 'abc' && reportData.movements) {
        pdf.setFont('helvetica', 'bold')
        pdf.text('ANÁLISIS ABC (PARETO)', 20, yPos)
        yPos += 10
        yPos = await addChartToPDF('abc-summary-cards', yPos);

        const tableData = (reportData.movements as any[]).map((item: any) => [
          item.classification,
          item.name,
          `Q ${item.totalValue.toLocaleString()}`,
          `${item.cumulativePercentage.toFixed(1)}%`
        ]);

        autoTable(pdf, {
          startY: yPos,
          head: [['Clase', 'Artículo', 'Inversión', '% Acumulado']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [16, 185, 129] },
          styles: { fontSize: 8 }
        });
      } else if ((reportType === 'entries' || reportType === 'exits') && reportData.movements) {
        const filteredMovements = reportData.movements.filter(m =>
          reportType === 'entries' ? m.type === 'entrada' : (m.type === 'salida' || m.type === 'requisicion')
        );

        const tableData = filteredMovements.map((m: any, idx: number) => {
          const qty = Math.abs(m.change || m.quantity || 0)
          const baseCols = [
            idx + 1,
            new Date(m.created_at).toLocaleDateString(),
            m.items?.name || 'N/A',
            qty,
            `Q ${(m.items?.unit_cost || 0).toLocaleString('es-GT', {minimumFractionDigits: 2})}`,
            `Q ${(qty * (m.items?.unit_cost || 0)).toLocaleString('es-GT', {minimumFractionDigits: 2})}`,
            m.justification || m.purpose || 'Sin referencia'
          ]
          
          if (reportType === 'exits') {
            const areaName = m.areaInfo ? (allDepartments.find(d => d.id === m.areaInfo.department_id)?.name || allCostCenters.find(c => c.id === m.areaInfo.cost_center_id)?.name || 'N/A') : 'N/A'
            const userName = m.user?.full_name || 'N/A'
            baseCols.splice(4, 0, areaName, userName)
          }
          return baseCols
        });

        const headCols = reportType === 'exits' 
          ? [['#', 'Fecha', 'Artículo', 'Cant.', 'Área', 'Responsable', 'V. Unit.', 'V. Total', 'Ref.']]
          : [['#', 'Fecha', 'Artículo', 'Cant.', 'V. Unit.', 'V. Total', 'Ref.']]

        autoTable(pdf, {
          startY: yPos,
          head: headCols,
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: reportType === 'entries' ? [16, 185, 129] : [225, 29, 72] },
          styles: { fontSize: 7, cellPadding: 2 },
          columnStyles: reportType === 'exits' ? { 6: { halign: 'right' }, 7: { halign: 'right' } } : { 4: { halign: 'right' }, 5: { halign: 'right' } }
        });

        if (reportType === 'exits' && !selectedCostCenter && !selectedDepartment) {
          const finalY = (pdf as any).lastAutoTable.finalY || yPos;
          let chartY = finalY + 15;
          if (chartY > pdf.internal.pageSize.getHeight() - 60) {
            pdf.addPage();
            chartY = 20;
          }
          pdf.setFont('helvetica', 'bold');
          pdf.text('COMPARATIVA DE GASTOS POR ÁREA', 20, chartY);
          await addChartToPDF('chart-exits-areas', chartY + 10);
        }
      } else if (reportType === 'orders' && reportData.orders) {
        const tableData = reportData.orders.map((o, idx) => [
          idx + 1,
          o.order_number || 'N/A',
          o.suppliers?.name || 'N/A',
          o.cost_centers?.name || 'N/A',
          `Q ${(o.total_amount || 0).toLocaleString()}`,
          o.status || 'N/A',
          o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('es-CO') : 'N/A'
        ]);

        autoTable(pdf, {
          startY: yPos,
          head: [['#', 'Número', 'Proveedor', 'Centro de Costo', 'Monto', 'Estado', 'Entrega']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [0, 102, 204], textColor: 255 },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
        });
      } else if (reportType === 'requisitions' && reportData.requisitions) {
        const tableData = reportData.requisitions.map((r, idx) => [
          idx + 1,
          r.requisition_number || 'N/A',
          r.justification ? (r.justification.length > 50 ? r.justification.substring(0, 50) + '...' : r.justification) : 'N/A',
          r.cost_centers?.name || 'N/A',
          `Q ${(r.estimated_amount || 0).toLocaleString()}`,
          r.status || 'N/A'
        ]);

        autoTable(pdf, {
          startY: yPos,
          head: [['#', 'Número', 'Justificación', 'Centro de Costo', 'Monto Est.', 'Estado']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [0, 102, 204] },
          styles: { fontSize: 8 }
        });
      } else if (reportType === 'requests' && reportData.requests) {
        const tableData = reportData.requests.map((r, idx) => [
          idx + 1,
          r.request_number || 'N/A',
          r.requested_by || 'N/A',
          r.cost_centers?.name || 'N/A',
          `Q ${(r.estimated_amount || 0).toLocaleString()}`,
          r.status || 'N/A'
        ]);

        autoTable(pdf, {
          startY: yPos,
          head: [['#', 'Número', 'Solicitante', 'Centro de Costo', 'Monto Est.', 'Estado']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [0, 102, 204] },
          styles: { fontSize: 8 }
        });
      } else if (reportType === 'inventory' && reportData.inventory) {
        const tableData = reportData.inventory.map((i, idx) => [
          idx + 1,
          i.item_code || i.code || 'N/A',
          i.name || 'N/A',
          i.category || 'N/A',
          i.current_stock || 0,
          `Q ${(i.unit_cost || 0).toLocaleString('es-GT', {minimumFractionDigits: 2})}`,
          `Q ${((i.current_stock || 0) * (i.unit_cost || 0)).toLocaleString('es-GT', {minimumFractionDigits: 2})}`
        ]);

        const totalInventoryValue = reportData.inventory.reduce((sum, i) => sum + ((i.current_stock || 0) * (i.unit_cost || 0)), 0);

        autoTable(pdf, {
          startY: yPos,
          head: [['#', 'Código', 'Nombre', 'Categoría', 'Stock', 'Costo Unit.', 'Valor Total']],
          body: tableData,
          foot: [['', '', '', '', '', 'VALOR TOTAL DEL INVENTARIO', `Q ${totalInventoryValue.toLocaleString('es-GT', {minimumFractionDigits: 2})}`]],
          theme: 'striped',
          headStyles: { fillColor: [0, 102, 204] },
          footStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
          styles: { fontSize: 8 },
          columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } }
        });
      } else if (reportType === 'cost-centers' && reportData.costCenters) {
        const tableData = reportData.costCenters.map((cc, idx) => [
          idx + 1,
          cc.name,
          cc.budgets?.name || 'N/A',
          `Q ${cc.budget_allocated?.toLocaleString()}`,
          `Q ${cc.totalAmount?.toLocaleString()}`,
          `Q ${(cc.budget_allocated - cc.totalAmount).toLocaleString()}`
        ]);

        autoTable(pdf, {
          startY: yPos,
          head: [['#', 'Centro de Costo', 'Presupuesto Maestro', 'Asignado', 'Ejecutado', 'Disponible']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [0, 102, 204] },
          styles: { fontSize: 8 },
          columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } }
        });
      } else if (reportType === 'suppliers' && reportData.suppliers) {
        const tableData = reportData.suppliers.map((s, idx) => [
          idx + 1,
          s.name,
          s.nit || 'N/A',
          s.contact_person || 'N/A',
          s.email || 'N/A',
          s.phone || 'N/A'
        ]);

        autoTable(pdf, {
          startY: yPos,
          head: [['#', 'Proveedor', 'NIT', 'Contacto', 'Email', 'Teléfono']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [0, 102, 204] },
          styles: { fontSize: 8 }
        });
      }

      // Pie de página
      const pageCount = pdf.internal.pages.length
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i)
        pdf.setFontSize(8)
        pdf.setTextColor(128, 128, 128)
        pdf.text(`© 2026 Colegio Manos a la Obra | Página ${i} de ${pageCount}`, 20, pdf.internal.pageSize.getHeight() - 10)
      }

      pdf.save(`Reporte-${reportType}-${new Date().getTime()}.pdf`)
      toast.success('PDF descargado correctamente')

      // Guardar en historial
      await saveReportHistory()
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Error al generar PDF')
    } finally {
      setExporting(false)
    }
  }

  const generateExcel = async () => {
    try {
      setExporting(true)

      const hasData = (reportType === 'dashboard' && reportData.summary) ||
        (reportType === 'dash-movements' && reportData.summary?.movementStats) ||
        (reportType === 'entries' && reportData.movements?.length! > 0) ||
        (reportType === 'exits' && reportData.movements?.length! > 0) ||
        (reportType === 'abc' && reportData.movements?.length! > 0) ||
        (reportType === 'requisitions' && reportData.requisitions?.length! > 0) ||
        (reportType === 'requests' && reportData.requests?.length! > 0) ||
        (reportType === 'orders' && reportData.orders?.length! > 0) ||
        (reportType === 'inventory' && reportData.inventory?.length! > 0) ||
        (reportType === 'cost-centers' && reportData.costCenters?.length! > 0) ||
        (reportType === 'suppliers' && reportData.suppliers?.length! > 0);

      if (!hasData) {
        toast.error('No hay datos para exportar en el período seleccionado');
        setExporting(false);
        return;
      }

      let exportData: any[] = []
      let fileName = ''

      if (reportType === 'dash-movements' && reportData.summary?.movementStats) {
        // Executive Summary Sheet for Movements
        exportData = [
          { 'KPI': 'Total Entradas', 'Valor': reportData.summary.movementStats.totalEntries },
          { 'KPI': 'Total Salidas', 'Valor': reportData.summary.movementStats.totalExits },
          { 'KPI': 'Balance Neto', 'Valor': reportData.summary.movementStats.netBalance },
          { 'KPI': 'Valor Movilizado (Q)', 'Valor': reportData.summary.movementStats.totalValue },
          { 'KPI': 'Artículo Más Solicitado', 'Valor': reportData.summary.movementStats.topItem },
          { 'KPI': 'Centro de Costo Más Activo', 'Valor': reportData.summary.movementStats.topDept }
        ]
        fileName = 'Resumen-Movimientos'
      } else if (reportType === 'entries' || reportType === 'exits') {
        exportData = (reportData.movements || [])
          .filter(m => reportType === 'entries' ? m.type === 'entrada' : (m.type === 'salida' || m.type === 'requisicion'))
          .map(m => {
            const deptName = m.areaInfo ? (allDepartments.find(d => d.id === m.areaInfo.department_id)?.name || 'N/A') : 'N/A'
            const ccName = m.areaInfo ? (allCostCenters.find(c => c.id === m.areaInfo.cost_center_id)?.name || 'N/A') : 'N/A'
            const result: any = {
              'Fecha': new Date(m.created_at).toLocaleDateString('es-CO'),
              'Artículo': m.items?.name || 'N/A',
              'Código': m.items?.item_code || 'N/A'
            }
            if (reportType === 'exits') {
              result['Área / Depto'] = deptName
              result['Centro de Costo'] = ccName
              result['Responsable'] = m.user?.full_name || 'N/A'
            }
            result['Cantidad'] = Math.abs(m.change || 0)
            result['Costo Unitario (Q)'] = m.items?.unit_cost || 0
            result['Monto Total (Q)'] = Math.abs(m.change || 0) * (m.items?.unit_cost || 0)
            result['Referencia'] = m.justification || m.purpose || 'Sin referencia'
            return result
          })
        fileName = reportType === 'entries' ? 'Entradas-Inventario' : 'Salidas-Inventario'
      } else if (reportType === 'abc' && reportData.movements) {
        exportData = reportData.movements.map(item => ({
          'Clase Pareto': item.classification,
          'Artículo': item.name,
          'Categoría': item.category,
          'Valor Movilizado (Q)': item.totalValue,
          '% Acumulado': item.cumulativePercentage.toFixed(2) + '%',
          'Prioridad': item.classification === 'A' ? 'CRÍTICA' : item.classification === 'B' ? 'MEDIA' : 'BAJA'
        }))
        fileName = 'Analisis-ABC'
      } else if (reportType === 'dashboard' && reportData.summary) {
        // Hoja de resumen ejecutivo
        exportData = [
          { 'Concepto': 'Gasto Total', 'Valor': `Q ${reportData.summary.totalSpent.toLocaleString()}` },
          { 'Concepto': 'Solicitudes Pendientes', 'Valor': reportData.summary.pendingApprovals },
          { 'Concepto': 'Items Stock Bajo', 'Valor': reportData.summary.lowStockItems },
          { 'Concepto': '', 'Valor': '' },
          { 'Concepto': 'EJECUCIÓN POR CENTRO', 'Valor': '' },
          ...reportData.summary.budgetUsage.map(bu => ({
            'Concepto': bu.name,
            'Valor': `Q ${bu.ejecutado.toLocaleString()} / Q ${bu.asignado.toLocaleString()}`
          }))
        ]
        fileName = 'Resumen-Ejecutivo'
      } else if (reportType === 'requisitions' && reportData.requisitions) {
        exportData = reportData.requisitions.map(r => ({
          'Fecha': new Date(r.created_at).toLocaleDateString('es-CO'),
          'Número': r.requisition_number || 'N/A',
          'Solicitante': r.requested_by || 'N/A',
          'Área / Departamento': allDepartments.find(d => d.id === r.department_id)?.name || 'N/A',
          'Centro de Costo': r.cost_centers?.name || 'N/A',
          'Monto Est. (Q)': r.estimated_amount || 0,
          'Estado': r.status || 'N/A',
          'Prioridad': r.priority || 'N/A',
          'Justificación': r.justification || 'N/A'
        }))
        fileName = 'Requisiciones'
      } else if (reportType === 'requests' && reportData.requests) {
        exportData = reportData.requests.map(r => ({
          'Fecha': new Date(r.created_at).toLocaleDateString('es-CO'),
          'Número': r.request_number || 'N/A',
          'Solicitante': r.requested_by || 'N/A',
          'Área / Departamento': allDepartments.find(d => d.id === r.department_id)?.name || 'N/A',
          'Centro de Costo': r.cost_centers?.name || 'N/A',
          'Monto Est. (Q)': r.estimated_amount || 0,
          'Estado': r.status || 'N/A',
          'Justificación': r.justification || 'N/A'
        }))
        fileName = 'Solicitudes-Compra'
      } else if (reportType === 'orders' && reportData.orders) {
        exportData = reportData.orders.map(o => ({
          'Fecha': new Date(o.created_at).toLocaleDateString('es-CO'),
          'Número': o.order_number || 'N/A',
          'Proveedor': o.suppliers?.name || 'N/A',
          'Área / Departamento': allDepartments.find(d => d.id === o.department_id)?.name || 'N/A',
          'Centro de Costo': o.cost_centers?.name || 'N/A',
          'Monto Total (Q)': o.total_amount || 0,
          'Estado': o.status || 'N/A',
          'Fecha Entrega': o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('es-CO') : 'N/A',
          'Notas': o.internal_notes || ''
        }))
        fileName = 'Ordenes-Compra'
      } else if (reportType === 'inventory' && reportData.inventory) {
        exportData = reportData.inventory.map(i => ({
          'Código': i.item_code || i.code || 'N/A',
          'Nombre': i.name || 'N/A',
          'Categoría': i.category || 'N/A',
          'Unidad': i.unit_of_measure || 'unidad',
          'Stock Actual': i.current_stock || 0,
          'Stock Mínimo': i.minimum_stock || 0,
          'Costo Unit. (Q)': i.unit_cost || 0,
          'Valor Total (Q)': (i.current_stock || 0) * (i.unit_cost || 0)
        }))
        
        const totalInventario = exportData.reduce((sum, row) => sum + row['Valor Total (Q)'], 0)
        exportData.push({
          'Código': 'TOTAL',
          'Nombre': 'VALOR TOTAL DEL INVENTARIO',
          'Categoría': '',
          'Unidad': '',
          'Stock Actual': '',
          'Stock Mínimo': '',
          'Costo Unit. (Q)': '',
          'Valor Total (Q)': totalInventario
        })
        fileName = 'Inventario'
      } else if (reportType === 'cost-centers' && reportData.costCenters) {
        exportData = reportData.costCenters.map(cc => ({
          'Centro de Costo': cc.name,
          'Presupuesto Maestro': cc.budgets?.name || 'N/A',
          'Asignado (Q)': cc.budget_allocated || 0,
          'Ejecutado (Q)': cc.totalAmount || 0,
          'Disponible (Q)': (cc.budget_allocated - cc.totalAmount),
          'Órdenes': cc.ordersCount || 0,
          'Estado': cc.is_active ? 'Activo' : 'Inactivo'
        }))
        fileName = 'Analisis-Presupuestario'
      } else if (reportType === 'suppliers' && reportData.suppliers) {
        exportData = reportData.suppliers.map(s => ({
          'Proveedor': s.name,
          'NIT': s.nit || 'N/A',
          'Contacto': s.contact_person || 'N/A',
          'Email': s.email || 'N/A',
          'Teléfono': s.phone || 'N/A',
          'Dirección': s.address || 'N/A',
          'Estado': s.is_active ? 'Activo' : 'Inactivo'
        }))
        fileName = 'Directorio-Proveedores'
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Maestro')

      XLSX.writeFile(workbook, `${fileName}_MAO_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel descargado correctamente')
    } catch (error) {
      console.error('Error generating Excel:', error)
      toast.error('Error al generar Excel')
    } finally {
      setExporting(false)
    }
  }

  const handleExport = (format: 'pdf' | 'excel') => {
    if (format === 'pdf') {
      generatePDF()
    } else {
      generateExcel()
    }
  }

  const saveReportHistory = async () => {
    try {
      // Disabled temporarily - report_exports table doesn't exist
      // if (!license?.id) return
      // await saveReportExport(license.id, reportType, format, user?.id)
    } catch (error) {
      console.error('Error saving report history:', error)
    }
  }

  const getStats = () => {
    if (reportType === 'requisitions' && reportData.requisitions) {
      const approved = reportData.requisitions.filter(r => r.status === 'Aprobada').length
      const pending = reportData.requisitions.filter(r => r.status === 'Pendiente').length
      return { total: reportData.requisitions.length, approved, pending }
    } else if (reportType === 'inventory' && reportData.inventory) {
      const lowStock = reportData.inventory.filter(i => (i.current_stock || 0) <= (i.minimum_stock || 0)).length
      const totalValue = reportData.inventory.reduce((sum, i) => sum + ((i.current_stock || 0) * (i.unit_cost || 0)), 0)
      return { total: reportData.inventory.length, lowStock, totalValue }
    } else if (reportType === 'exits' && reportData.movements) {
      const exits = reportData.movements.filter(m => m.type === 'salida' || m.type === 'requisicion')
      const totalValue = exits.reduce((sum, m) => sum + (Math.abs(m.change || 0) * (m.items?.unit_cost || 0)), 0)
      return { total: exits.length, totalValue }
    }
    return {}
  }

  const stats = getStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">📊 Reportes Profesionales</h1>
        <p className="text-gray-600 mt-1">Descarga y exporta reportes en PDF y Excel con gráficos</p>
      </div>

      {/* Filtros de Fecha */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Periodo Inicial</label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 font-bold text-gray-700"
                />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Periodo Final</label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 font-bold text-gray-700"
                />
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                const today = new Date()
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
                setStartDate(firstDay.toISOString().split('T')[0])
                setEndDate(today.toISOString().split('T')[0])
              }}
              className="flex-1 md:flex-none px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all font-black text-[10px] uppercase tracking-widest"
            >
              Mes Actual
            </button>
            <button
              onClick={() => {
                setStartDate('')
                setEndDate('')
                setSelectedCostCenter('')
                setSelectedDepartment('')
              }}
              className="px-6 py-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all font-black text-[10px] uppercase tracking-widest"
            >
              Limpiar
            </button>
        </div>

        {/* Filtro de Área / Departamento (para reportes relevantes) */}
        {(reportType === 'requisitions' || reportType === 'requests' || reportType === 'orders') && (
          <div className="w-full md:w-64 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
              📍 Área / Departamento
            </label>
            <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 font-bold text-gray-700 appearance-none"
                >
                    <option value="">Todas las Áreas</option>
                    {allDepartments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                </select>
            </div>
          </div>
        )}

        {/* Filtro de Centro de Costo (para todos los reportes relevantes) */}
        {(reportType === 'requisitions' || reportType === 'requests' || reportType === 'orders' || reportType === 'cost-centers') && (
          <div className="w-full md:w-64 space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
              🏢 Centro de Costo
            </label>
            <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <select
                    value={selectedCostCenter}
                    onChange={(e) => setSelectedCostCenter(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/20 font-bold text-gray-700 appearance-none"
                >
                    <option value="">Todos los Centros</option>
                    {allCostCenters.map(cc => (
                        <option key={cc.id} value={cc.id}>{cc.name}</option>
                    ))}
                </select>
            </div>
          </div>
        )}
      </div>


      {/* Selector de Reporte Categorizado - Diseño Compacto y Horizontal */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] px-1">Catálogo de Reportes Maestros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {REPORT_CATEGORIES.map(cat => (
            <div key={cat.id} className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${cat.color} bg-slate-50`}>
                    {cat.icon}
                </div>
                <h3 className="font-bold text-slate-800 text-sm">{cat.label}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {cat.reports.map(rep => (
                  <button
                    key={rep.id}
                    onClick={() => {
                      setReportType(rep.id as any)
                      setReportData({})
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 ${
                      reportType === rep.id 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200 -translate-y-0.5' 
                        : 'bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    <span>{rep.label}</span>
                    {reportType === rep.id && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

        <div className="flex flex-col gap-6 mt-8">
        {/* Barra Superior de Exportación (Horizontal) */}
        <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
              <h3 className="text-xl font-black mb-1">Exportar Reporte Actual</h3>
              <p className="text-slate-400 text-xs font-medium">Genere documentos listos para impresión o análisis legal</p>
          </div>

          <div className="relative z-10 flex flex-wrap gap-4">
              <button
                  onClick={() => handleExport('pdf')}
                  disabled={loading || exporting}
                  className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 hover:border-white/20"
              >
                  <FileText size={18} className="text-rose-400" />
                  <div className="text-left">
                      <p className="text-xs font-black">PDF</p>
                  </div>
              </button>

              <button
                  onClick={() => handleExport('excel')}
                  disabled={loading || exporting}
                  className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 hover:border-white/20"
              >
                  <Database size={18} className="text-emerald-400" />
                  <div className="text-left">
                      <p className="text-xs font-black">Excel</p>
                  </div>
              </button>
          </div>
        </div>
      </div>

      {/* Área de Visualización */}
      <div className="lg:col-span-3">

      {/* Stats */}
      {Object.keys(stats).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {stats.total && <div className="card p-6">
            <p className="text-sm text-gray-600">Total de Registros</p>
            <p className="text-3xl font-bold text-primary mt-2">{stats.total}</p>
          </div>}
          {stats.approved && <div className="card p-6">
            <p className="text-sm text-gray-600">Aprobadas</p>
            <p className="text-3xl font-bold text-success mt-2">{stats.approved}</p>
          </div>}
          {stats.pending && <div className="card p-6">
            <p className="text-sm text-gray-600">Pendientes</p>
            <p className="text-3xl font-bold text-warning mt-2">{stats.pending}</p>
          </div>}
          {stats.lowStock && <div className="card p-6">
            <p className="text-sm text-gray-600">Stock Bajo</p>
            <p className="text-3xl font-bold text-error mt-2">{stats.lowStock}</p>
          </div>}
          {stats.totalValue && <div className="card p-6">
            <p className="text-sm text-gray-600">Valor Total</p>
            <p className="text-2xl font-bold text-info mt-2">Q {stats.totalValue.toLocaleString('es-GT', {minimumFractionDigits: 2})}</p>
          </div>}
        </div>
      )}

      {/* Contenido del Reporte (oculto, para captura) */}
      <div id="report-content" className="hidden">
        <div className="p-8 bg-white">
          {/* Encabezado con logo */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-blue-600">
            <img
              src="/logo-mao.png"
              alt="Logo MAO"
              className="w-16 h-16 object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-blue-900">MAO 2026</h1>
              <p className="text-sm text-gray-600">Colegio Manos a la Obra - Sistema de Gestión</p>
            </div>
          </div>

          <h2 className="text-xl font-bold mb-2">
            {reportType === 'requisitions' && '📋 Reporte de Requisiciones'}
            {reportType === 'requests' && '✉️ Reporte de Solicitudes de Compra'}
            {reportType === 'orders' && '📦 Reporte de Órdenes de Compra'}
            {reportType === 'inventory' && '📚 Reporte de Inventario'}
          </h2>

          <div className="mb-6 text-sm text-gray-600">
            <p><strong>Fecha de Reporte:</strong> {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Generado por:</strong> {user?.full_name || 'Sistema'}</p>
            <p><strong>Hora:</strong> {new Date().toLocaleTimeString('es-CO')}</p>
          </div>

          {/* Tabla de Requisiciones */}
          {reportType === 'requisitions' && reportData.requisitions && reportData.requisitions.length > 0 && (
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2 text-left">Código</th>
                  <th className="border p-2 text-left">Número</th>
                  <th className="border p-2 text-left">Justificación</th>
                  <th className="border p-2 text-right">Monto</th>
                  <th className="border p-2 text-center">Prioridad</th>
                  <th className="border p-2 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {reportData.requisitions.map(r => (
                  <tr key={r.id}>
                    <td className="border p-2">{r.id ? r.id.slice(0, 8) : '-'}</td>
                    <td className="border p-2">{r.requisition_number || '-'}</td>
                    <td className="border p-2 text-sm">{r.justification ? r.justification.slice(0, 50) : '-'}</td>
                    <td className="border p-2 text-right">${(r.estimated_amount || 0).toLocaleString()}</td>
                    <td className="border p-2 text-center text-sm font-medium">{r.priority || '-'}</td>
                    <td className="border p-2 text-center">{r.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportType === 'requisitions' && (!reportData.requisitions || reportData.requisitions.length === 0) && (
            <div className="p-6 text-center text-gray-500">No hay requisiciones para mostrar</div>
          )}

          {/* Tabla de Solicitudes */}
          {reportType === 'requests' && reportData.requests && reportData.requests.length > 0 && (
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2 text-left">Código</th>
                  <th className="border p-2 text-left">Número</th>
                  <th className="border p-2 text-left">Justificación</th>
                  <th className="border p-2 text-right">Monto</th>
                  <th className="border p-2 text-center">Estado</th>
                  <th className="border p-2 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {reportData.requests.map(r => (
                  <tr key={r.id}>
                    <td className="border p-2">{r.id ? r.id.slice(0, 8) : '-'}</td>
                    <td className="border p-2">{r.request_number || '-'}</td>
                    <td className="border p-2 text-sm">{r.justification ? r.justification.slice(0, 50) : '-'}</td>
                    <td className="border p-2 text-right">${(r.estimated_amount || 0).toLocaleString()}</td>
                    <td className="border p-2 text-center">{r.status || '-'}</td>
                    <td className="border p-2 text-sm">{r.created_at ? new Date(r.created_at).toLocaleDateString('es-CO') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportType === 'requests' && (!reportData.requests || reportData.requests.length === 0) && (
            <div className="p-6 text-center text-gray-500">No hay solicitudes para mostrar</div>
          )}

          {/* Tabla de Órdenes */}
          {reportType === 'orders' && reportData.orders && reportData.orders.length > 0 && (
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2 text-left">Código</th>
                  <th className="border p-2 text-left">Número</th>
                  <th className="border p-2 text-right">Monto Total</th>
                  <th className="border p-2 text-center">Estado</th>
                  <th className="border p-2 text-center">Fecha Entrega</th>
                  <th className="border p-2 text-left">Fecha Orden</th>
                </tr>
              </thead>
              <tbody>
                {reportData.orders.map(o => (
                  <tr key={o.id}>
                    <td className="border p-2">{o.id ? o.id.slice(0, 8) : '-'}</td>
                    <td className="border p-2">{o.order_number || '-'}</td>
                    <td className="border p-2 text-right">${(o.total_amount || 0).toLocaleString()}</td>
                    <td className="border p-2 text-center">{o.status || '-'}</td>
                    <td className="border p-2 text-center text-sm">{o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('es-CO') : '-'}</td>
                    <td className="border p-2 text-sm">{o.created_at ? new Date(o.created_at).toLocaleDateString('es-CO') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportType === 'orders' && (!reportData.orders || reportData.orders.length === 0) && (
            <div className="p-6 text-center text-gray-500">No hay órdenes para mostrar</div>
          )}

          {/* Tabla de Inventario */}
          {reportType === 'inventory' && reportData.inventory && reportData.inventory.length > 0 && (
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2 text-left">Código</th>
                  <th className="border p-2 text-left">Nombre</th>
                  <th className="border p-2 text-center">Stock</th>
                  <th className="border p-2 text-center">Mín.</th>
                  <th className="border p-2 text-right">Costo Unit.</th>
                  <th className="border p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {reportData.inventory.map(i => (
                  <tr key={i.id} className={(i.current_stock || 0) <= (i.minimum_stock || 0) ? 'bg-red-50' : ''}>
                    <td className="border p-2">{i.item_code || i.code || '-'}</td>
                    <td className="border p-2 text-sm">{i.name || '-'}</td>
                    <td className="border p-2 text-center font-bold">{i.current_stock || 0}</td>
                    <td className="border p-2 text-center">{i.minimum_stock || 0}</td>
                    <td className="border p-2 text-right">${(i.unit_cost || 0).toLocaleString()}</td>
                    <td className="border p-2 text-right font-semibold">${((i.current_stock || 0) * (i.unit_cost || 0)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportType === 'inventory' && (!reportData.inventory || reportData.inventory.length === 0) && (
            <div className="p-6 text-center text-gray-500">No hay items de inventario para mostrar</div>
          )}

          {/* Tabla de Proveedores */}
          {reportType === 'suppliers' && reportData.suppliers && reportData.suppliers.length > 0 && (
            <table className="w-full border-collapse border border-gray-300">
              <thead className="bg-gray-200">
                <tr>
                  <th className="border p-2 text-left">Proveedor</th>
                  <th className="border p-2 text-left">NIT</th>
                  <th className="border p-2 text-left">Contacto</th>
                  <th className="border p-2 text-left">Email</th>
                  <th className="border p-2 text-left">Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {reportData.suppliers.map(s => (
                  <tr key={s.id}>
                    <td className="border p-2 font-bold">{s.name}</td>
                    <td className="border p-2">{s.nit || '-'}</td>
                    <td className="border p-2">{s.contact_person || '-'}</td>
                    <td className="border p-2">{s.email || '-'}</td>
                    <td className="border p-2">{s.phone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {reportType === 'suppliers' && (!reportData.suppliers || reportData.suppliers.length === 0) && (
            <div className="p-6 text-center text-gray-500">No hay proveedores para mostrar</div>
          )}

          {/* Pie del Reporte */}
          <div className="mt-6 border-t pt-4 text-xs text-gray-500">
            <p>Reporte confidencial - MAO 2026 Sistema de Gestión</p>
            <p>Generado automáticamente. Para consultas contacte al administrador.</p>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="mt-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-slate-500 font-medium animate-pulse">Generando reporte maestro...</p>
          </div>
        ) : reportType === 'abc' && reportData.movements ? (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="bg-white p-6 rounded-xl border border-dotted border-slate-300">
              <h3 className="text-lg font-bold text-slate-800 mb-2">📊 Análisis ABC (Ley de Pareto)</h3>
              <p className="text-xs text-slate-500 mb-6">
                El 20% de sus artículos suelen representar el 80% de su valor movilizado. Priorice el control en los artículos **Clase A**.
              </p>

              <div id="abc-summary-cards" className="grid grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase">Clase A</span>
                  <p className="text-2xl font-black text-emerald-700">80%</p>
                  <p className="text-[9px] text-emerald-600">Alta Prioridad</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-600 uppercase">Clase B</span>
                  <p className="text-2xl font-black text-amber-700">15%</p>
                  <p className="text-[9px] text-amber-600">Prioridad Media</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Clase C</span>
                  <p className="text-2xl font-black text-slate-600">5%</p>
                  <p className="text-[9px] text-slate-400">Baja Prioridad</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr className="text-[10px] uppercase text-slate-400 font-bold">
                      <th className="px-4 py-2 text-left">Clase</th>
                      <th className="px-4 py-2 text-left">Artículo</th>
                      <th className="px-4 py-2 text-right">Inversión (Periodo)</th>
                      <th className="px-4 py-2 text-right">% Acumulado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {reportData.movements.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${item.classification === 'A' ? 'bg-emerald-100 text-emerald-700' :
                            item.classification === 'B' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-500'
                            }`}>
                            Clase {item.classification}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-[10px] text-slate-400">{item.category}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-black text-slate-700">Q {item.totalValue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500">{item.cumulativePercentage.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : reportType === 'trends' && reportData.summary?.monthlyTrends ? (
          <div className="space-y-6 animate-in slide-in-from-right duration-500">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Flujo de Inventario</h3>
                  <p className="text-xs text-slate-500">Balance de Entradas vs Salidas (Frecuencia Diaria)</p>
                </div>
                <TrendingUp size={24} className="text-blue-600" />
              </div>
              <div id="chart-inventory-flow" className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={reportData.summary.monthlyTrends}>
                    <defs>
                      <linearGradient id="entriesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="exitsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} stroke="#64748b" axisLine={false} tickLine={false} />
                    <YAxis fontSize={11} stroke="#64748b" axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                    <Area name="Entradas" type="monotone" dataKey="entries" stroke="#10b981" strokeWidth={4} fill="url(#entriesGrad)" />
                    <Area name="Salidas" type="monotone" dataKey="exits" stroke="#f43f5e" strokeWidth={4} fill="url(#exitsGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-slate-50 p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center">
              <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
                <TrendingUp className="text-blue-600" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Mapa de Calor y Predicciones</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-2">
                Estamos procesando más movimientos para habilitar las proyecciones de stock impulsadas por patrones de consumo.
              </p>
            </div>
          </div>
        ) : reportType === 'dash-movements' && reportData.summary?.movementStats ? (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
            {/* Movement KPIs */}
            <div id="movement-kpi-cards" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-green-500">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Entradas</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{reportData.summary.movementStats.totalEntries} <span className="text-xs font-normal text-slate-400">unids</span></h3>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-green-600 font-bold">
                  <TrendingUp size={12} /> +12% vs mes anterior
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-rose-500">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Salidas</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{reportData.summary.movementStats.totalExits} <span className="text-xs font-normal text-slate-400">unids</span></h3>
                <div className="mt-2 flex items-center gap-1 text-[10px] text-rose-600 font-bold">
                  <TrendingUp size={12} className="rotate-180" /> +5% vs mes anterior
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-blue-500">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance Neto</p>
                <h3 className={`text-2xl font-black mt-1 ${reportData.summary.movementStats.netBalance >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                  {reportData.summary.movementStats.netBalance > 0 ? '+' : ''}{reportData.summary.movementStats.netBalance}
                </h3>
                <p className="text-[10px] text-slate-400 mt-2">Crecimiento de almacén</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-amber-500">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valor Movilizado</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">Q {reportData.summary.movementStats.totalValue.toLocaleString('es-GT', { maximumFractionDigits: 0 })}</h3>
                <p className="text-[10px] text-slate-400 mt-2">Flujo monetario del periodo</p>
              </div>
            </div>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-xl p-6 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-blue-400 text-[10px] font-bold uppercase mb-1">Artículo Estrella</p>
                  <h4 className="text-xl font-bold truncate mb-4">{reportData.summary.movementStats.topItem}</h4>
                  <div className="flex gap-4">
                    <div className="bg-white/10 rounded-lg p-3 text-center flex-1">
                      <p className="text-[9px] text-slate-300 uppercase">Velocidad</p>
                      <p className="text-lg font-bold">🔥 Alta</p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-center flex-1">
                      <p className="text-[9px] text-slate-300 uppercase">Proyección</p>
                      <p className="text-lg font-bold">14 días</p>
                    </div>
                  </div>
                </div>
                <Package size={80} className="absolute -bottom-4 -right-4 text-white/5" />
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-100 shadow-sm">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Building2 size={16} className="text-blue-600" /> DEPARTAMENTO MÁS ACTIVO
                </h4>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-black text-slate-900">{reportData.summary.movementStats.topDept}</p>
                    <p className="text-xs text-slate-500 mt-1">Representa el 34% de las salidas</p>
                  </div>
                  <div className="h-12 w-24 bg-slate-50 rounded flex items-end gap-1 p-2">
                    <div className="h-4 w-2 bg-blue-200 rounded-t"></div>
                    <div className="h-8 w-2 bg-blue-300 rounded-t"></div>
                    <div className="h-6 w-2 bg-blue-400 rounded-t"></div>
                    <div className="h-10 w-2 bg-blue-600 rounded-t"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (reportType === 'entries' || reportType === 'exits') && reportData.movements ? (
          <div className="card p-0 overflow-hidden animate-in fade-in duration-500">
            <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">
                {reportType === 'entries' ? '📥 Registro de Entradas' : '📤 Registro de Salidas'}
              </h3>
              <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                {reportData.movements.filter(m => reportType === 'entries' ? m.movement_type === 'entrada' : (m.movement_type === 'salida' || m.movement_type === 'requisicion')).length} Registros
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white border-b">
                <tr className="text-slate-400 text-[10px] uppercase font-bold">
                  <th className="px-4 py-3 text-left">Fecha</th>
                  <th className="px-4 py-3 text-left">Artículo</th>
                  <th className="px-4 py-3 text-right">Cantidad</th>
                  <th className="px-4 py-3 text-right">V. Unitario</th>
                  <th className="px-4 py-3 text-right">V. Total</th>
                  <th className="px-4 py-3 text-left">Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {reportData.movements
                  .filter(m => reportType === 'entries' ? m.movement_type === 'entrada' : (m.movement_type === 'salida' || m.movement_type === 'requisicion'))
                  .map(m => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-slate-500">{new Date(m.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-800">{m.items?.name || 'Item Desconocido'}</p>
                        <p className="text-[10px] text-slate-400">{m.items?.category || m.items?.item_code}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-700">{m.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-500">Q {(m.items?.unit_cost || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">Q {(m.quantity * (m.items?.unit_cost || 0)).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">
                          {m.reference_type || 'Manual'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : reportType === 'dashboard' && reportData.summary ? (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Executive KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <BarChart3 className="text-blue-600" size={24} />
                  </div>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase">Inversión Compras</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Q {reportData.summary.totalSpent.toLocaleString('es-GT', { minimumFractionDigits: 0 })}</h3>
                <p className="text-slate-500 text-[10px] mt-1">Total órdenes aprobadas</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <Package className="text-emerald-600" size={24} />
                  </div>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">Valor Almacén</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-800">Q {reportData.summary.totalWarehouseValue?.toLocaleString('es-GT', { minimumFractionDigits: 0 }) || '0'}</h3>
                <p className="text-slate-500 text-[10px] mt-1">Activos en inventario actual</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <ListChecks className="text-amber-600" size={24} />
                  </div>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase">Pendientes</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-800">{reportData.summary.pendingApprovals}</h3>
                <p className="text-slate-500 text-[10px] mt-1">Solicitudes en revisión</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-rose-50 rounded-lg">
                    <AlertTriangle className="text-rose-600" size={24} />
                  </div>
                  <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full uppercase">Stock Bajo</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-800">{reportData.summary.lowStockItems}</h3>
                <p className="text-slate-500 text-[10px] mt-1">Alertas de reposición</p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <Building2 className="text-slate-600" size={24} />
                  </div>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase">Centros</span>
                </div>
                <h3 className="text-3xl font-bold text-slate-800">{allCostCenters.length}</h3>
                <p className="text-slate-500 text-[10px] mt-1">Dependencias activas</p>
              </div>
            </div>



            {/* Visual Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Ejecución Presupuestaria</h3>
                    <p className="text-xs text-slate-500">Comparativa Asignado vs. Ejecutado por Centro</p>
                  </div>
                  <BarChart3 className="text-slate-400" size={20} />
                </div>
                <div id="chart-budget-usage" className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.summary.budgetUsage} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={120}
                        fontSize={11}
                        stroke="#64748b"
                        tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                      />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`Q ${value.toLocaleString()}`, '']}
                      />
                      <Legend iconType="circle" />
                      <Bar name="Asignado" dataKey="asignado" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={12} />
                      <Bar name="Ejecutado" dataKey="ejecutado" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Tendencia de Gastos</h3>
                    <p className="text-xs text-slate-500">Historial de órdenes de compra (últimos meses)</p>
                  </div>
                  <TrendingUp className="text-slate-400" size={20} />
                </div>
                <div id="chart-monthly-trends" className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={reportData.summary.monthlyTrends}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={12} stroke="#64748b" axisLine={false} tickLine={false} />
                      <YAxis fontSize={12} stroke="#64748b" axisLine={false} tickLine={false} tickFormatter={(value) => `Q${value / 1000}k`} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: any) => [`Q ${value.toLocaleString()}`, 'Gasto']}
                      />
                      <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Building2 size={120} />
                </div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-2">Visión Estratégica</h2>
                  <p className="text-slate-400 text-sm max-w-sm mb-6">
                    Seleccione un área para gestionar directamente desde este reporte maestro.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => navigate('/dashboard/budgets')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-colors flex items-center justify-between group text-xs">
                      <span>Presupuestos</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button onClick={() => navigate('/dashboard/cost-centers')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-colors flex items-center justify-between group text-xs">
                      <span>Centros</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button onClick={() => navigate('/dashboard/purchase-orders')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-colors flex items-center justify-between group text-xs">
                      <span>Órdenes</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button onClick={() => navigate('/dashboard/inventory')} className="bg-white/10 hover:bg-white/20 p-3 rounded-lg text-left transition-colors flex items-center justify-between group text-xs">
                      <span>Inventario</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm uppercase">
                  <AlertTriangle className="text-amber-500" size={18} /> Alertas de Stock Bajo
                </h3>
                <div className="space-y-3">
                  {reportData.inventory?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-100">
                      <div className="flex items-center gap-3">
                        <Package className="text-rose-600" size={16} />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{item.name}</p>
                          <p className="text-[10px] text-rose-600 font-bold">Stock: {item.current_stock} / Mín: {item.minimum_stock}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/inventory')} className="h-7 text-[10px] text-rose-700 hover:bg-rose-100">Corregir</Button>
                    </div>
                  ))}
                  {reportData.summary.lowStockItems === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <CheckCircle className="text-emerald-500 mb-2" size={30} />
                      <p className="text-slate-600 font-medium text-xs">Todo bajo control</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">📋 Vista Previa</h2>
            <div className="overflow-x-auto">
              {reportType === 'requisitions' && reportData.requisitions && reportData.requisitions.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Número</th>
                      <th className="px-4 py-2 text-left">Justificación</th>
                      <th className="px-4 py-2 text-left">Área / Depto</th>
                      <th className="px-4 py-2 text-right">Monto</th>
                      <th className="px-4 py-2 text-center">Estado</th>
                      <th className="px-4 py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(reportData.requisitions || []).slice(0, 10).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 font-bold text-blue-600">{r.requisition_number || '-'}</td>
                        <td className="px-4 py-2 text-xs text-slate-600">{r.justification ? r.justification.slice(0, 60) : '-'}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">{allDepartments.find(d => d.id === r.department_id)?.name || '-'}</td>
                        <td className="px-4 py-2 text-right font-semibold">Q {(r.estimated_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'aprobado' ? 'bg-emerald-100 text-emerald-700' :
                            r.status === 'rechazado' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                            }`}>{r.status || '-'}</span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/requisitions/${r.id}`)}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowRight size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {reportType === 'requests' && reportData.requests && reportData.requests.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Número</th>
                      <th className="px-4 py-2 text-left">Solicitante</th>
                      <th className="px-4 py-2 text-left">Área / Depto</th>
                      <th className="px-4 py-2 text-right">Monto</th>
                      <th className="px-4 py-2 text-center">Estado</th>
                      <th className="px-4 py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(reportData.requests || []).slice(0, 10).map(r => (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 font-bold text-amber-600">{r.request_number || '-'}</td>
                        <td className="px-4 py-2 text-xs">{r.requested_by || '-'}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">{allDepartments.find(d => d.id === r.department_id)?.name || '-'}</td>
                        <td className="px-4 py-2 text-right font-semibold">Q {(r.estimated_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${r.status === 'aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>{r.status || '-'}</span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/purchase-requests/${r.id}`)}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowRight size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {reportType === 'orders' && reportData.orders && reportData.orders.length > 0 && (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Número</th>
                      <th className="px-4 py-2 text-left">Área / Depto</th>
                      <th className="px-4 py-2 text-right">Monto</th>
                      <th className="px-4 py-2 text-center">Estado</th>
                      <th className="px-4 py-2 text-center">Entrega</th>
                      <th className="px-4 py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(reportData.orders || []).slice(0, 10).map(o => (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2 font-bold text-indigo-600">{o.order_number || '-'}</td>
                        <td className="px-4 py-2 text-xs text-slate-500">{allDepartments.find(d => d.id === o.department_id)?.name || '-'}</td>
                        <td className="px-4 py-2 text-right font-semibold">Q {(o.total_amount || 0).toLocaleString()}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${o.status === 'completado' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'
                            }`}>{o.status || '-'}</span>
                        </td>
                        <td className="px-4 py-2 text-center text-xs">{o.delivery_date ? new Date(o.delivery_date).toLocaleDateString('es-CO') : '-'}</td>
                        <td className="px-4 py-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/dashboard/purchase-orders/${o.id}`)}
                            className="h-8 w-8 p-0"
                          >
                            <ArrowRight size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Chart for Exits by Area */}
              {reportType === 'exits' && reportData.movements && !selectedCostCenter && !selectedDepartment && (
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 mb-6 animate-in fade-in duration-500">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-800">Comparativa por Áreas</h3>
                      <p className="text-xs text-slate-500">Distribución del gasto (Top 10)</p>
                    </div>
                    <BarChart3 className="text-slate-400" size={20} />
                  </div>
                  <div id="chart-exits-areas" className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(() => {
                        const areaMap: Record<string, number> = {}
                        reportData.movements.filter(m => m.type === 'salida' || m.type === 'requisicion').forEach(m => {
                          const areaName = m.areaInfo ? (allDepartments.find(d => d.id === m.areaInfo.department_id)?.name || allCostCenters.find(c => c.id === m.areaInfo.cost_center_id)?.name || 'Desconocida') : 'Desconocida'
                          const value = Math.abs(m.change || 0) * (m.items?.unit_cost || 0)
                          areaMap[areaName] = (areaMap[areaName] || 0) + value
                        })
                        return Object.entries(areaMap)
                          .map(([name, value]) => ({ name, value }))
                          .sort((a, b) => b.value - a.value)
                          .slice(0, 10)
                      })()} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={150} fontSize={10} stroke="#64748b" tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} formatter={(value: any) => [`Q ${value.toLocaleString('es-GT', {minimumFractionDigits: 2})}`, 'Total (Q)']} />
                        <Bar name="Gasto Total" dataKey="value" fill="#f43f5e" radius={[0, 8, 8, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {(reportType === 'entries' || reportType === 'exits') && reportData.movements && (
                <div className="overflow-x-auto w-full rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm">
                      <tr className="text-[10px] uppercase text-slate-400 font-black tracking-widest">
                        <th className="px-6 py-4 text-left">Fecha</th>
                        <th className="px-6 py-4 text-left">Artículo</th>
                        <th className="px-6 py-4 text-right">Cantidad</th>
                        {reportType === 'exits' && <th className="px-6 py-4 text-left">Área / Responsable</th>}
                        <th className="px-6 py-4 text-left">Referencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.movements
                        .filter(m => reportType === 'entries' ? m.type === 'entrada' : (m.type === 'salida' || m.type === 'requisicion'))
                        .slice(0, 20)
                        .map((m, idx) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-all duration-300 group">
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full group-hover:bg-white group-hover:shadow-sm transition-all">{new Date(m.created_at).toLocaleDateString('es-CO')}</span>
                            </td>
                            <td className="px-6 py-4">
                              <p className="font-black text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{m.items?.name || 'Item Desconocido'}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-1 bg-slate-50 inline-block px-2 py-0.5 rounded border border-slate-100">{m.items?.item_code}</p>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex items-center justify-center px-3 py-1 rounded-xl text-sm font-black ${reportType === 'entries' ? 'bg-emerald-100/50 text-emerald-600 border border-emerald-100' : 'bg-rose-100/50 text-rose-600 border border-rose-100'}`}>
                                {reportType === 'entries' ? '+' : '-'}{Math.abs(m.change)}
                              </span>
                            </td>
                            {reportType === 'exits' && (
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold text-slate-700 text-xs truncate max-w-[180px] flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    {m.areaInfo ? (allDepartments.find(d => d.id === m.areaInfo.department_id)?.name || allCostCenters.find(c => c.id === m.areaInfo.cost_center_id)?.name || 'Área Desconocida') : 'N/A'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium truncate max-w-[180px] ml-3">
                                    👤 {m.user?.full_name || 'Usuario Desconocido'}
                                  </span>
                                </div>
                              </td>
                            )}
                            <td className="px-6 py-4">
                              <p className="text-xs text-slate-500 max-w-[250px] truncate group-hover:whitespace-normal group-hover:bg-white group-hover:shadow-lg group-hover:absolute group-hover:z-10 group-hover:p-3 group-hover:rounded-xl group-hover:border group-hover:border-slate-100 transition-all origin-left">
                                {m.justification || m.purpose || 'Sin referencia'}
                              </p>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
              {reportType === 'inventory' && reportData.inventory && reportData.inventory.length > 0 && (
                <div className="overflow-x-auto w-full rounded-2xl border border-slate-100 shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Código</th>
                        <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wider text-slate-500">Nombre</th>
                        <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-500">Stock Actual</th>
                        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-500">Costo Unit.</th>
                        <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wider text-slate-500">Valor Total</th>
                        <th className="px-4 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-500">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(reportData.inventory || []).slice(0, 20).map(i => {
                        const totalValor = (i.current_stock || 0) * (i.unit_cost || 0);
                        return (
                          <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-mono text-[11px] text-slate-400">{i.item_code || i.code || '-'}</td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-800">{i.name || '-'}</td>
                            <td className={`px-4 py-3 text-center font-black ${i.current_stock <= (i.minimum_stock || 0) ? 'text-rose-600' : 'text-slate-900'}`}>{i.current_stock || 0}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-600">Q {(i.unit_cost || 0).toLocaleString('es-GT', {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-3 text-right font-black text-blue-700 bg-blue-50/30">Q {totalValor.toLocaleString('es-GT', {minimumFractionDigits: 2})}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-[6px] text-[9px] font-black uppercase ${i.current_stock <= (i.minimum_stock || 0) ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                {i.current_stock <= (i.minimum_stock || 0) ? 'Bajo' : 'OK'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {/* Fila de Total si hay inventario */}
                      <tr className="bg-slate-900 text-white">
                        <td colSpan={4} className="px-4 py-4 text-right font-black uppercase text-xs">Valor Total del Inventario Mostrado:</td>
                        <td className="px-4 py-4 text-right font-black text-emerald-400">
                          Q {(reportData.inventory || []).slice(0, 20).reduce((sum, i) => sum + ((i.current_stock || 0) * (i.unit_cost || 0)), 0).toLocaleString('es-GT', {minimumFractionDigits: 2})}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {reportType === 'cost-centers' && reportData.costCenters && reportData.costCenters.length > 0 && (
                <div className="space-y-6">
                  {reportData.costCenters.map(cc => (
                    <div key={cc.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3 pb-3 border-b">
                        <div>
                          <h3 className="font-bold text-lg">🏢 {cc.name}</h3>
                          <p className="text-sm text-gray-600">{cc.description || 'Sin descripción'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{cc.ordersCount} Órdenes</p>
                          <p className="text-xl font-bold text-primary">Q {cc.totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                      {cc.orders && cc.orders.length > 0 ? (
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Número</th>
                              <th className="px-3 py-2 text-right">Monto</th>
                              <th className="px-3 py-2 text-center">Estado</th>
                              <th className="px-3 py-2 text-left">Fecha</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {cc.orders.slice(0, 5).map((order: any) => (
                              <tr key={order.id} className="hover:bg-gray-50">
                                <td className="px-3 py-2">{order.order_number || '-'}</td>
                                <td className="px-3 py-2 text-right font-semibold">Q {(order.total_amount || 0).toLocaleString()}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{order.status || '-'}</span>
                                </td>
                                <td className="px-3 py-2 text-xs">{order.created_at ? new Date(order.created_at).toLocaleDateString('es-CO') : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-center text-gray-500 py-4 text-sm">Sin órdenes de compra</p>
                      )}
                      {cc.orders && cc.orders.length > 5 && (
                        <p className="text-center text-xs text-gray-500 mt-2">Y {cc.orders.length - 5} órdenes más...</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {((reportType === 'requisitions' && (!reportData.requisitions || reportData.requisitions.length === 0)) ||
                (reportType === 'requests' && (!reportData.requests || reportData.requests.length === 0)) ||
                (reportType === 'orders' && (!reportData.orders || reportData.orders.length === 0)) ||
                (reportType === 'inventory' && (!reportData.inventory || reportData.inventory.length === 0)) ||
                (reportType === 'cost-centers' && (!reportData.costCenters || reportData.costCenters.length === 0))) && (
                  <div className="p-6 text-center text-gray-500">No hay datos para mostrar</div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
)
}
