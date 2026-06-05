import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (import.meta.env as any).VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = (import.meta.env as any).VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Faltan variables de entorno de Supabase')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Función para autenticar usuario por código
export async function authenticateUser(authCode: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, licenses(*)')
      .eq('auth_code', authCode.toUpperCase())
      .eq('is_active', true)
      .single()

    if (error) {
      console.error('Error en autenticación:', error)
      throw new Error('Usuario no encontrado')
    }

    if (!data) {
      throw new Error('Usuario no encontrado')
    }

    return data
  } catch (error) {
    console.error('Error authenticating user:', error)
    throw error
  }
}

// Función para obtener inventario (directo de tabla para datos completos)
export async function getInventory(licenseId: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, item_code, name, category, current_stock, minimum_stock, unit_cost, location, unit_of_measure, units_per_package, barcode')
      .eq('license_id', licenseId)
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return data?.map(item => ({
      id: item.id,
      item_code: item.item_code || '',
      code: item.item_code || '',
      name: item.name,
      category: item.category,
      current_stock: item.current_stock || 0,
      minimum_stock: item.minimum_stock || 0,
      unit_cost: item.unit_cost || 0,
      location: item.location || '',
      is_low_stock: (item.current_stock || 0) <= (item.minimum_stock || 0),
      unit_of_measure: item.unit_of_measure || 'unidades',
      units_per_package: item.units_per_package || 1,
      barcode: item.barcode || '',
    }))
  } catch (error) {
    console.error('Error fetching inventory:', error)
    throw error
  }
}

// Función para obtener requisiciones
export async function getRequisitions(licenseId: string, userId?: string) {
  try {
    // Validar que licenseId sea válido
    if (!licenseId) {
      console.error('getRequisitions: licenseId es inválido', { licenseId })
      throw new Error('licenseId es requerido')
    }

    console.log('getRequisitions: iniciando con', { licenseId, userId })

    let query = supabase
      .from('requisitions')
      .select('*')
      .eq('license_id', licenseId)

    if (userId) {
      console.log('getRequisitions: filtrando por usuario', { userId })
      query = query.eq('user_id', userId)
    } else {
      console.log('getRequisitions: sin filtro de usuario, obteniendo todas')
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('getRequisitions: error de Supabase', error)
      throw error
    }

    // Fetch user data separately for each requisition
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(r => r.user_id).filter(Boolean))]
      const costCenterIds = [...new Set(data.map(r => r.cost_center_id).filter(Boolean))]

      const [usersResult, costCentersResult] = await Promise.all([
        supabase
          .from('users')
          .select('id, full_name, email, role')
          .in('id', userIds),
        costCenterIds.length > 0
          ? supabase
            .from('cost_centers')
            .select('id, code, name')
            .in('id', costCenterIds)
          : Promise.resolve({ data: [] })
      ])

      const usersMap = new Map(usersResult.data?.map(u => [u.id, u]) || [])
      const costCentersMap = new Map(costCentersResult.data?.map(cc => [cc.id, cc]) || [])

      data.forEach(req => {
        if (req.user_id) {
          req.users = usersMap.get(req.user_id)
        }
        if (req.cost_center_id) {
          const cc = costCentersMap.get(req.cost_center_id)
          if (cc) {
            req.cost_center_code = cc.code
            req.cost_center_name = cc.name
          }
        }
      })
    }

    console.log('getRequisitions: se obtuvieron', { cantidad: data?.length || 0 })
    return data
  } catch (error) {
    console.error('getRequisitions: error completo', error)
    throw error
  }
}

// Función para obtener órdenes de compra
export async function getPurchaseOrders(licenseId: string) {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Obtener suppliers por separado
    const { data: suppliers, error: suppliersError } = await supabase
      .from('suppliers')
      .select('*')
      .eq('license_id', licenseId)

    if (suppliersError) throw suppliersError

    // Obtener purchase_requests vinculadas para el PDF
    const requestIds = data?.map(o => o.purchase_request_id).filter(Boolean) || []

    let requestsMap = new Map()
    if (requestIds.length > 0) {
      const { data: requests, error: reqError } = await supabase
        .from('purchase_requests')
        .select('*, users(full_name, department)')
        .in('id', requestIds)

      if (!reqError && requests) {
        requestsMap = new Map(requests.map(r => [r.id, r]))
      }
    }

    // Mapear suppliers y requests a las órdenes
    const ordersWithDetails = data?.map(order => ({
      ...order,
      suppliers: suppliers?.find(s => s.id === order.supplier_id),
      purchase_requests: order.purchase_request_id ? requestsMap.get(order.purchase_request_id) : null
    })) || []

    return ordersWithDetails
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    throw error
  }
}

// Función para actualizar orden de compra (estado, precio, etc.)
export async function updatePurchaseOrderFull(orderId: string, updates: {
  status?: string
  total_amount?: number
  price_confirmed_at?: string
  invoice_url?: string
  payment_reference?: string
  internal_notes?: string
}) {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating purchase order:', error)
    throw error
  }
}

// Función para confirmar precio final de orden Y Afectar Presupuesto/Centro Costo
export async function confirmFinalPrice(orderId: string, finalAmount: number) {
  try {
    // 1. Actualizar orden
    const { data: order, error } = await supabase
      .from('purchase_orders')
      .update({
        total_amount: finalAmount,
        price_confirmed_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error

    // 2. Afectar Centro de Costo (si tiene)
    if (order.cost_center_id) {
      console.log('🔄 Afectando Presupuesto del Centro de Costo:', order.cost_center_id);

      // Obtener estado actual del CC
      const { data: cc } = await supabase
        .from('cost_centers')
        .select('budget_spent, budget_allocated')
        .eq('id', order.cost_center_id)
        .single();

      if (cc) {
        const newSpent = (cc.budget_spent || 0) + finalAmount;

        // Actualizar gastado
        await supabase
          .from('cost_centers')
          .update({ budget_spent: newSpent })
          .eq('id', order.cost_center_id);

        // TODO: Check if exceeded and notify?
      }
    }

    return order
  } catch (error) {
    console.error('Error confirming final price:', error)
    throw error
  }
}


// Función para obtener solicitudes de compra
export async function getPurchaseRequests(licenseId: string, userId?: string) {
  try {
    // Validar que licenseId sea válido
    if (!licenseId) {
      console.error('getPurchaseRequests: licenseId es inválido', { licenseId })
      throw new Error('licenseId es requerido')
    }

    console.log('getPurchaseRequests: iniciando con', { licenseId, userId })

    let query = supabase
      .from('purchase_requests')
      .select('*, users(*), attachment_url')
      .eq('license_id', licenseId)

    if (userId) {
      console.log('getPurchaseRequests: filtrando por usuario', { userId })
      query = query.eq('user_id', userId)
    } else {
      console.log('getPurchaseRequests: sin filtro de usuario, obteniendo todas')
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('getPurchaseRequests: error de Supabase', error)
      throw error
    }

    console.log('getPurchaseRequests: se obtuvieron', { cantidad: data?.length || 0, data })
    return data
  } catch (error) {
    console.error('getPurchaseRequests: error completo', error)
    throw error
  }
}

// Función para obtener proveedores
export async function getSuppliers(licenseId: string) {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('license_id', licenseId)
      .eq('is_active', true)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    throw error
  }
}

// Función para obtener logs de auditoría
export async function getAuditLogs(licenseId: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*, users(*)')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    throw error
  }
}

// Función para crear log de auditoría
export async function createAuditLog(licenseId: string, userId: string, action: string, module: string, target: string) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert([
        {
          license_id: licenseId,
          user_id: userId,
          action,
          module,
          target,
          ip_address: 'local',
          status: 'exitoso',
        },
      ])

    if (error) throw error
  } catch (error) {
    console.error('Error creating audit log:', error)
  }
}

// ============================================
// FUNCIONES PARA CREAR REGISTROS
// ============================================

// Crear una nueva requisición
export async function createRequisition(data: {
  license_id: string
  user_id: string
  requisition_number: string
  status?: string
  priority: string
  justification: string
  estimated_amount: number
  quantity?: number
}) {
  try {
    // Validar que los IDs no sean vacíos
    if (!data.license_id || !data.user_id) {
      throw new Error('license_id y user_id son requeridos')
    }

    const { data: result, error } = await supabase
      .from('requisitions')
      .insert([{
        license_id: data.license_id,
        user_id: data.user_id,
        requisition_number: data.requisition_number,
        status: data.status || 'pendiente',
        priority: data.priority,
        justification: data.justification,
        estimated_amount: data.estimated_amount,
        quantity: data.quantity || null,
      }])
      .select()

    if (error) {
      console.error('Supabase error:', { code: error.code, message: error.message, details: error.details })
      throw error
    }
    return result
  } catch (error) {
    console.error('Error creating requisition:', error)
    throw error
  }
}

/**
 * Upload attachment (quotation/image) for a purchase request
 * @param licenseId - License ID
 * @param requestId - Purchase Request ID (for folder organization)
 * @param file - File to upload
 * @returns Public URL of the uploaded file
 */
export async function uploadPurchaseRequestAttachment(
  licenseId: string,
  requestId: string,
  file: File
): Promise<string> {
  try {
    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('El archivo excede el tamaño máximo de 5MB');
    }

    // Validate file type (PDF, PNG, JPG, JPEG)
    const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Formato de archivo no permitido. Use PDF, PNG o JPG');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `${licenseId}/${requestId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('purchase-request-attachments')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Error al subir archivo: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('purchase-request-attachments')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadPurchaseRequestAttachment:', error);
    throw error;
  }
}

/**
 * Upload delivery signature to Supabase Storage
 * Converts canvas data URL to PNG blob and uploads
 * @param licenseId - License ID
 * @param deliveryId - Delivery ID (for folder organization)
 * @param signatureDataUrl - Canvas toDataURL() result (base64 PNG)
 * @returns Public URL of the uploaded signature
 */
export async function uploadDeliverySignature(
  licenseId: string,
  deliveryId: string,
  signatureDataUrl: string
): Promise<string> {
  try {
    // Convert data URL to blob
    const response = await fetch(signatureDataUrl);
    const blob = await response.blob();

    // Validate size (max 1MB for signatures)
    const MAX_SIZE = 1 * 1024 * 1024; // 1MB
    if (blob.size > MAX_SIZE) {
      throw new Error('La firma excede el tamaño máximo de 1MB');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}-signature.png`;
    const filePath = `${licenseId}/${deliveryId}/${fileName}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('delivery-signatures')
      .upload(filePath, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload signature error:', uploadError);
      throw new Error(`Error al subir firma: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('delivery-signatures')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadDeliverySignature:', error);
    throw error;
  }
}

// Crear una nueva solicitud de compra
export async function createPurchaseRequest(data: {
  license_id: string
  user_id: string
  request_number: string
  justification: string
  estimated_amount: number
  status?: string
  attachmentFile?: File // Optional attachment (quotation/image)
}) {
  try {
    // Validar que los IDs no sean vacíos
    if (!data.license_id || !data.user_id) {
      throw new Error('license_id y user_id son requeridos')
    }

    // 1. Obtener el departamento del usuario
    const { data: userData } = await supabase
      .from('users')
      .select('department')
      .eq('id', data.user_id)
      .single();

    let costCenterId = null;

    // 2. Buscar Cost Center asociado al departamento (si existe)
    if (userData?.department) {
      const { data: ccData } = await supabase
        .from('cost_centers')
        .select('id')
        .eq('license_id', data.license_id)
        .eq('department', userData.department)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle(); // maybeSingle para no lanzar error si no hay

      if (ccData) {
        costCenterId = ccData.id;
        console.log('✅ Auto-assigned Cost Center:', costCenterId, 'for Dept:', userData.department);
      } else {
        console.warn('⚠️ No active Cost Center found for department:', userData.department);
      }
    }

    // 3. Create the purchase request first (without attachment)
    const { data: result, error } = await supabase
      .from('purchase_requests')
      .insert([{
        license_id: data.license_id,
        user_id: data.user_id,
        request_number: data.request_number,
        justification: data.justification,
        estimated_amount: data.estimated_amount,
        status: data.status || 'pendiente',
        cost_center_id: costCenterId // Assign auto-detected ID
      }])
      .select()

    if (error) {
      console.error('Supabase error:', { code: error.code, message: error.message, details: error.details })
      throw error
    }

    // 4. If file is provided, upload it and update the request
    if (data.attachmentFile && result && result.length > 0) {
      const requestId = result[0].id;
      try {
        const attachmentUrl = await uploadPurchaseRequestAttachment(
          data.license_id,
          requestId,
          data.attachmentFile
        );

        // Update request with attachment URL
        const { error: updateError } = await supabase
          .from('purchase_requests')
          .update({ attachment_url: attachmentUrl })
          .eq('id', requestId);

        if (updateError) {
          console.warn('Warning: Request created but attachment failed to link:', updateError);
        } else {
          // Update result with attachment URL
          result[0].attachment_url = attachmentUrl;
        }
      } catch (uploadError) {
        console.warn('Warning: Request created but file upload failed:', uploadError);
        // Don't fail the entire request if just the upload fails
      }
    }

    return result
  } catch (error) {
    console.error('Error creating purchase request:', error)
    throw error
  }
}


// Crear una nueva orden de compra
export async function createPurchaseOrder(data: {
  license_id: string
  order_number: string
  supplier_id: string
  status?: string
  total_amount: number
  delivery_date: string
  budget_id?: string | null
  payment_method?: string
  payment_reference?: string
  internal_notes?: string
}) {
  try {
    const { data: result, error } = await supabase
      .from('purchase_orders')
      .insert([{
        license_id: data.license_id,
        order_number: data.order_number,
        supplier_id: data.supplier_id,
        status: data.status || 'borrador',
        total_amount: data.total_amount,
        delivery_date: data.delivery_date,
        budget_id: data.budget_id || null,
        payment_method: data.payment_method || 'credito',
        payment_reference: data.payment_reference || '',
        internal_notes: data.internal_notes || '',
      }])
      .select()

    if (error) throw error
    return result
  } catch (error) {
    console.error('Error creating purchase order:', error)
    throw error
  }
}

// NOTE: `updateInventoryStock` implementation moved further down to a
// consolidated version that also records inventory movements and audit logs.
// Older, simpler implementation removed to avoid duplicate exports.

// Obtener siguiente número de requisición
export async function getNextRequisitionNumber(licenseId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .rpc('get_next_requisition_number', { p_license_id: licenseId })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting next requisition number:', error)
    // Fallback extremadamente seguro en caso de error de RPC
    return `REQ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  }
}

// Obtener siguiente número de solicitud
export async function getNextPurchaseRequestNumber(licenseId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('purchase_requests')
      .select('request_number')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })
      .limit(100) // Obtener los últimos 100 para buscar el máximo

    if (error) throw error

    if (!data || data.length === 0) {
      return 'SOL-2026-0001'
    }

    // Buscar el número máximo de todos los registros
    let maxNumber = 0
    for (const item of data) {
      if (item.request_number) {
        const parts = item.request_number.split('-')
        const num = parseInt(parts[2], 10)
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num
        }
      }
    }

    const nextNumber = maxNumber + 1
    console.log(`getNextPurchaseRequestNumber: máximo encontrado=${maxNumber}, siguiente=${nextNumber}`)
    return `SOL-2026-${String(nextNumber).padStart(4, '0')}`
  } catch (error) {
    console.error('Error getting next purchase request number:', error)
    return `SOL-2026-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  }
}

// Obtener siguiente número de orden
export async function getNextOrderNumber(licenseId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('order_number')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })
      .limit(100) // Obtener los últimos 100 para buscar el máximo

    if (error) throw error

    if (!data || data.length === 0) {
      return 'ORD-2026-0001'
    }

    // Buscar el número máximo de todos los registros
    let maxNumber = 0
    for (const item of data) {
      if (item.order_number) {
        const parts = item.order_number.split('-')
        const num = parseInt(parts[2], 10)
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num
        }
      }
    }

    const nextNumber = maxNumber + 1
    console.log(`getNextOrderNumber: máximo encontrado=${maxNumber}, siguiente=${nextNumber}`)
    return `ORD-2026-${String(nextNumber).padStart(4, '0')}`
  } catch (error) {
    console.error('Error getting next order number:', error)
    return `ORD-2026-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
  }
}

// Función para obtener usuarios
export async function getUsers(licenseId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('license_id', licenseId)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching users:', error)
    throw error
  }
}

// ============================================
// NUEVAS FUNCIONES - APROBACIÓN Y ÓRDENES
// ============================================

// Aprobar o rechazar requisición
export async function updateRequisitionStatus(requisitionId: string, status: string) {
  try {
    // Obtener la requisición actual para saber el usuario y license
    const { data: req, error: reqFetchError } = await supabase
      .from('requisitions')
      .select('license_id, user_id, status')
      .eq('id', requisitionId)
      .single()

    if (reqFetchError || !req) throw reqFetchError || new Error('Requisición no encontrada')

    // Actualizar status
    const { error } = await supabase
      .from('requisitions')
      .update({ status })
      .eq('id', requisitionId)

    if (error) {
      console.error('Supabase error:', { code: error.code, message: error.message, details: error.details })
      throw error
    }

    // Si se aprueba, registrar salidas de inventario
    if (status === 'aprobada' && req.status !== 'aprobada') {
      try {
        const { data: result, error: procError } = await supabase.rpc('process_requisition_approval', {
          p_requisition_id: requisitionId,
          p_license_id: req.license_id,
          p_user_id: req.user_id || null
        })
        if (procError) {
          console.warn('RPC process_requisition_approval error:', procError)
          // No fallar si la función no existe todavía; continuar
        } else {
          console.log('Inventario procesado:', result)
        }
      } catch (rpcErr) {
        console.warn('Error calling process_requisition_approval:', rpcErr)
      }
    }

    // Si se rechaza (y estaba aprobada), revertir salidas
    if (status === 'rechazada' && req.status === 'aprobada') {
      try {
        const { data: result, error: revertErr } = await supabase.rpc('revert_requisition_rejection', {
          p_requisition_id: requisitionId,
          p_license_id: req.license_id,
          p_user_id: req.user_id || null
        })
        if (revertErr) {
          console.warn('RPC revert_requisition_rejection error:', revertErr)
        } else {
          console.log('Inventario revertido:', result)
        }
      } catch (revertRpcErr) {
        console.warn('Error calling revert_requisition_rejection:', revertRpcErr)
      }
    }

    return true
  } catch (error) {
    console.error('Error updating requisition status:', error)
    throw error
  }
}

// Aprobar o rechazar solicitud de compra
export async function updatePurchaseRequestStatus(requestId: string, status: string) {
  try {
    // Solo actualizar el status, no hay columna comments en la tabla
    const { error } = await supabase
      .from('purchase_requests')
      .update({ status })
      .eq('id', requestId)

    if (error) {
      console.error('Supabase error:', { code: error.code, message: error.message, details: error.details })
      throw error
    }
    return true
  } catch (error) {
    console.error('Error updating purchase request status:', error)
    throw error
  }
}

// Crear orden de compra desde solicitud de compra aprobada
export async function createPurchaseOrderFromRequest(data: {
  license_id: string
  purchase_request_id: string
  supplier_id: string
  delivery_date: string
  budget_id?: string | null
  payment_method?: string
  payment_reference?: string // Nuevo campo
  internal_notes?: string
  quotation_url?: string // Nuevo campo
}) {
  try {
    const orderNumber = await getNextOrderNumber(data.license_id)

    // 1. Obtener datos de la solicitud para heredar cost_center_id y estimated_amount
    const { data: requestData } = await supabase
      .from('purchase_requests')
      .select('cost_center_id, estimated_amount')
      .eq('id', data.purchase_request_id)
      .single();

    const { data: createdOrder, error } = await supabase
      .from('purchase_orders')
      .insert({
        license_id: data.license_id,
        order_number: orderNumber,
        supplier_id: data.supplier_id,
        status: 'pendiente',
        total_amount: requestData?.estimated_amount || 0,
        delivery_date: data.delivery_date,
        budget_id: data.budget_id || null, // Keep explicit budget if passed
        cost_center_id: requestData?.cost_center_id || null, // Inherit CC
        payment_method: data.payment_method || 'credito',
        payment_reference: data.payment_reference || '',
        internal_notes: data.internal_notes || '',
        purchase_request_id: data.purchase_request_id, // Ensure link is kept
        quotation_url: data.quotation_url || null // Guardar cotización
      })
      .select()

    if (error) throw error

    // Actualizar la solicitud de compra a estado 'convertida_orden'
    const { error: updateError } = await supabase
      .from('purchase_requests')
      .update({ status: 'convertida_orden' })
      .eq('id', data.purchase_request_id)

    if (updateError) {
      console.warn('Warning: Could not update purchase request status:', updateError)
    }

    return createdOrder?.[0] || { order_number: orderNumber }
  } catch (error) {
    console.error('Error creating purchase order:', error)
    throw error
  }
}

// Actualizar estado de orden de compra
export async function updatePurchaseOrderStatus(orderId: string, status: string) {
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status })
      .eq('id', orderId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating purchase order status:', error)
    throw error
  }
}

// Actualizar fecha de entrega de orden de compra
export async function updatePurchaseOrderDeliveryDate(orderId: string, deliveryDate: string) {
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .update({ delivery_date: deliveryDate })
      .eq('id', orderId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error updating purchase order delivery date:', error)
    throw error
  }
}

// ============================================
// SISTEMA DE TRIPLE APROBACIÓN
// ============================================

// 1. Enviar orden a revisión (Dispara el bloqueo y creación de aprobaciones)
export async function sendOrderToReview(orderId: string, _userId: string) {
  try {
    // A. Actualizar estado de la orden a 'pending_approval' y bloquearla
    const { error: orderError } = await supabase
      .from('purchase_orders')
      .update({
        status: 'pending_approval',
        is_locked: true
      })
      .eq('id', orderId)

    if (orderError) throw orderError

    // B. Crear registros de aprobación para los 3 roles
    const roles = ['jefe_presupuesto', 'jefe_operaciones', 'jefe_calidad']
    const approvals = roles.map(role => ({
      purchase_order_id: orderId,
      approver_role: role,
      status: 'pending'
    }))

    const { error: approvalError } = await supabase
      .from('purchase_order_approvals')
      .insert(approvals)

    if (approvalError) throw approvalError

    return true
  } catch (error) {
    console.error('Error sending order to review:', error)
    throw error
  }
}

// 2. Obtener estado de aprobaciones de una orden
export async function getOrderApprovals(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('purchase_order_approvals')
      .select('*')
      .eq('purchase_order_id', orderId)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting order approvals:', error)
    throw error // Retornar array vacío o manejar error arriba
  }
}

// 3. Aprobar orden (Un jefe específico aprueba su parte)
export async function approveOrder(approvalId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('purchase_order_approvals')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approver_user_id: userId
      })
      .eq('id', approvalId)

    // NOTA: El trigger en BD verificará si ya están las 3 aprobaciones y actualizará la orden.

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error approving order:', error)
    throw error
  }
}

// 4. Rechazar orden (Un jefe rechaza, lo que rechaza toda la orden)
export async function rejectOrder(approvalId: string, userId: string, reason: string) {
  try {
    const { error } = await supabase
      .from('purchase_order_approvals')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        approver_user_id: userId,
        comments: reason
      })
      .eq('id', approvalId)

    // NOTA: El trigger en BD detectará el rechazo y actualizará la orden a 'rejected' + desbloqueo.

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error rejecting order:', error)
    throw error
  }
}

// ============================================
// ENTREGA EN VENTANILLA
// ============================================
// Crear una entrega (Ventanilla Express)
export async function createDelivery(data: {
  license_id: string
  receiver_name: string
  department: string
  items: any[]
  signatureDataUrl?: string // Canvas data URL
  delivered_by: string
}) {
  try {
    // 1. Create delivery record first (without signature URL)
    const { data: result, error } = await supabase
      .from('deliveries')
      .insert([{
        license_id: data.license_id,
        receiver_name: data.receiver_name,
        department: data.department,
        items: data.items,
        signature_url: null, // Will update after upload
        delivered_by: data.delivered_by
      }])
      .select()

    if (error) throw error

    const deliveryRecord = result && result.length > 0 ? result[0] : null;
    if (!deliveryRecord) throw new Error('Failed to create delivery record');

    const deliveryId = deliveryRecord.id;

    // 2. Update stock and record movements for each item
    if (data.items && data.items.length > 0) {
      for (const item of data.items) {
        if (item.id) {
          try {
            await updateInventoryStock(
              item.id,
              Number(item.quantity) || 0,
              'subtract',
              {
                licenseId: data.license_id,
                userId: data.delivered_by,
                relatedType: 'delivery',
                relatedId: deliveryId,
                justification: `Entrega a ${data.receiver_name} (${data.department})`,
                purpose: 'Despacho Ventanilla / Entrega Express'
              }
            );
          } catch (stockError) {
            console.error(`Error updating stock for item ${item.id}:`, stockError);
          }
        }
      }
    }

    // 3. If signature provided, upload it
    if (data.signatureDataUrl) {
      try {
        const signatureUrl = await uploadDeliverySignature(
          data.license_id,
          deliveryId,
          data.signatureDataUrl
        );

        // Update delivery with signature URL
        await supabase
          .from('deliveries')
          .update({ signature_url: signatureUrl })
          .eq('id', deliveryId);
        
        deliveryRecord.signature_url = signatureUrl;
      } catch (uploadError) {
        console.warn('Warning: Delivery created but signature upload failed:', uploadError);
      }
    }

    return result
  } catch (error) {
    console.error('Error creating delivery:', error)
    throw error
  }
}


// Duplicate function removed

export async function getDeliveriesByReceiver(licenseId: string, receiverName: string) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('license_id', licenseId)
      .ilike('receiver_name', receiverName)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting receiver history:', error)
    return []
  }
}

export async function getRecentDeliveries(licenseId: string) {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('*')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })
      .limit(50) // Últimas 50 entregas

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting recent deliveries:', error)
    return []
  }
}

// ============================================
// NOTIFICACIONES POR EMAIL
// ============================================

export interface EmailNotification {
  license_id: string
  recipient_email: string
  subject: string
  body: string
  notification_type: string
  related_id?: string
  sent: boolean
}

// Crear notificación de email
export async function createEmailNotification(notification: Omit<EmailNotification, 'sent'>) {
  try {
    const { data, error } = await supabase
      .from('email_notifications')
      .insert([{ ...notification, sent: false }])
      .select()

    if (error) throw error
    return data?.[0]
  } catch (error) {
    console.error('Error creating email notification:', error)
    throw error
  }
}

// Obtener notificaciones pendientes
export async function getPendingEmailNotifications() {
  try {
    const { data, error } = await supabase
      .from('email_notifications')
      .select('*')
      .eq('sent', false)
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching pending notifications:', error)
    throw error
  }
}

// Marcar notificación como enviada
export async function markEmailNotificationAsSent(notificationId: string) {
  try {
    const { error } = await supabase
      .from('email_notifications')
      .update({ sent: true, sent_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error marking notification as sent:', error)
    throw error
  }
}

// Enviar notificación por cambio de estado de requisición
export async function sendRequisitionStatusNotification(requisitionId: string, requisitionNumber: string, newStatus: string, userEmail: string, userName: string, licenseId?: string) {
  try {
    const statusLabels: Record<string, string> = {
      'aprobada': 'Aprobada',
      'rechazada': 'Rechazada',
      'en_revision': 'En Revisión'
    }

    const subject = `Requisición ${requisitionNumber} - ${statusLabels[newStatus] || newStatus}`
    const body = `Hola ${userName},\n\nSu requisición ${requisitionNumber} ha sido ${statusLabels[newStatus]?.toLowerCase() || newStatus}.\n\nFecha: ${new Date().toLocaleDateString('es-GT')}`

    await createEmailNotification({
      license_id: licenseId || '',
      recipient_email: userEmail,
      subject,
      body,
      notification_type: 'requisition_status_change',
      related_id: requisitionId
    })
  } catch (error) {
    console.error('Error sending requisition notification:', error)
  }
}

// Enviar notificación por cambio de estado de solicitud
export async function sendPurchaseRequestStatusNotification(requestId: string, requestNumber: string, newStatus: string, userEmail: string, userName: string, licenseId?: string) {
  try {
    // Don't send notification if licenseId is missing (would cause UUID error)
    if (!licenseId) {
      console.warn('Skipping email notification: licenseId is missing');
      return;
    }

    const statusLabels: Record<string, string> = {
      'aprobada': 'Aprobada',
      'rechazada': 'Rechazada',
      'en_revision': 'En Revisión'
    }

    const subject = `Solicitud de Compra ${requestNumber} - ${statusLabels[newStatus] || newStatus}`
    const body = `Hola ${userName},\n\nSu solicitud de compra ${requestNumber} ha sido ${statusLabels[newStatus]?.toLowerCase() || newStatus}.\n\nFecha: ${new Date().toLocaleDateString('es-GT')}`

    await createEmailNotification({
      license_id: licenseId,
      recipient_email: userEmail,
      subject,
      body,
      notification_type: 'purchase_request_status_change',
      related_id: requestId
    })
  } catch (error) {
    console.error('Error sending purchase request notification:', error)
  }
}

// Enviar notificación por cambio de estado de orden
export async function sendPurchaseOrderStatusNotification(orderId: string, orderNumber: string, newStatus: string, supplierEmail: string, supplierName: string, licenseId?: string) {
  try {
    const statusLabels: Record<string, string> = {
      'pendiente': 'Pendiente',
      'en_revision': 'En Revisión',
      'en_transito': 'En Tránsito',
      'completada': 'Completada',
      'cancelada': 'Cancelada'
    }

    const subject = `Orden de Compra ${orderNumber} - ${statusLabels[newStatus] || newStatus}`
    const body = `Hola ${supplierName},\n\nLa orden de compra ${orderNumber} ha sido actualizada a: ${statusLabels[newStatus]?.toLowerCase() || newStatus}.\n\nFecha: ${new Date().toLocaleDateString('es-GT')}`

    await createEmailNotification({
      license_id: licenseId || '',
      recipient_email: supplierEmail,
      subject,
      body,
      notification_type: 'purchase_order_status_change',
      related_id: orderId
    })
  } catch (error) {
    console.error('Error sending purchase order notification:', error)
  }
}

// Enviar notificaciones a las 3 jefaturas para aprobación triple
export async function sendTripleApprovalNotifications(orderData: {
  id: string,
  order_number: string,
  total_amount: number,
  supplier_name: string,
  requester_name: string
}, licenseId: string, appUrl: string) {
  try {
    if (!licenseId) {
      console.warn('⚠️ No se puede enviar notificaciones: licenseId no proporcionado');
      return false;
    }

    console.log('📧 Iniciando proceso de notificaciones de triple aprobación...', {
      order: orderData.order_number,
      amount: orderData.total_amount
    });

    // 1. Obtener los jefes de las 3 áreas (Presupuesto, Operaciones, Calidad)
    const roles = ['jefe_presupuesto', 'jefe_operaciones', 'jefe_calidad', 'admin'];
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('email, full_name, role')
      .eq('license_id', licenseId)
      .in('role', roles)
      .eq('is_active', true);

    if (fetchError) {
      console.error('❌ Error al buscar jefaturas en DB:', fetchError);
      throw fetchError;
    }

    if (!users || users.length === 0) {
      console.warn('⚠️ No se encontraron usuarios con roles de jefatura activos para esta licencia.');
      return false;
    }

    // Filtrar para asegurar que tenemos al menos uno de cada rol o avisar cuáles faltan
    const foundRoles = new Set(users.map(u => u.role));
    console.log(`✅ Usuarios encontrados: ${users.length}. Roles cubiertos: ${Array.from(foundRoles).join(', ')}`);

    const formatter = new Intl.NumberFormat('es-GT', {
      style: 'currency',
      currency: 'GTQ',
    });

    const amountStr = formatter.format(orderData.total_amount);

    // 2. Crear las notificaciones en la cola de la base de datos
    let createdCount = 0;
    for (const user of users) {
      const subject = `⚠️ ACCIÓN REQUERIDA: Aprobación de Orden ${orderData.order_number}`

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-top: 5px solid #1e40af;">
          <div style="padding: 20px;">
            <h2 style="color: #1e40af;">Revisión de Orden de Compra</h2>
            <p>Hola <strong>${user.full_name}</strong>,</p>
            <p>Se requiere su revisión y aprobación para la siguiente orden:</p>
            
            <div style="background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <table style="width: 100%;">
                <tr><td><strong>Orden:</strong></td><td>${orderData.order_number}</td></tr>
                <tr><td><strong>Proveedor:</strong></td><td>${orderData.supplier_name}</td></tr>
                <tr><td><strong>Monto:</strong></td><td style="color: #1e40af; font-weight: bold;">${amountStr}</td></tr>
                <tr><td><strong>Solicitante:</strong></td><td>${orderData.requester_name}</td></tr>
              </table>
            </div>
            
            <p>Por favor, ingrese al sistema para procesar su decisión.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${appUrl}/dashboard/purchase-orders" style="background: #1e40af; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Abrir Panel de Aprobaciones</a>
            </div>
          </div>
          <div style="background: #f9f9f9; padding: 10px; text-align: center; font-size: 12px; color: #666;">
            Sistema de Logística MAO 2026 - Colegio Manos a la Obra
          </div>
        </div>
      `;

      try {
        await createEmailNotification({
          license_id: licenseId,
          recipient_email: user.email,
          subject,
          body: htmlBody,
          notification_type: 'triple_approval_request',
          related_id: orderData.id
        });
        createdCount++;
      } catch (err) {
        console.error(`❌ Fallo al encolar notificación para ${user.email}:`, err);
      }
    }

    console.log(`✅ Proceso finalizado. ${createdCount} notificaciones encoladas.`);
    return true;
  } catch (error) {
    console.error('❌ Error general en sendTripleApprovalNotifications:', error);
    return false;
  }
}

// ========== CRUD PROVEEDORES ==========
export async function createSupplier(data: {
  license_id: string
  name: string
  contact: string
  email: string
  phone: string
  city: string
  rating?: number
}) {
  try {
    const { data: result, error } = await supabase
      .from('suppliers')
      .insert([{
        license_id: data.license_id,
        name: data.name,
        contact_name: data.contact,
        email: data.email,
        phone: data.phone,
        city: data.city,
        rating: data.rating || 5,
      }])
      .select()

    if (error) throw error
    return result?.[0]
  } catch (error) {
    console.error('Error creating supplier:', error)
    throw error
  }
}

export async function updateSupplier(supplierId: string, data: {
  name?: string
  contact?: string
  email?: string
  phone?: string
  city?: string
  rating?: number
}) {
  try {
    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.contact !== undefined) updateData.contact_name = data.contact
    if (data.email !== undefined) updateData.email = data.email
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.city !== undefined) updateData.city = data.city
    if (data.rating !== undefined) updateData.rating = data.rating

    const { data: result, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', supplierId)
      .select()

    if (error) throw error
    return result?.[0]
  } catch (error) {
    console.error('Error updating supplier:', error)
    throw error
  }
}

export async function deleteSupplier(supplierId: string) {
  try {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplierId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error deleting supplier:', error)
    throw error
  }
}

// ========== CRUD INVENTARIO ==========
export async function createInventoryItem(data: {
  license_id: string
  item_code: string
  name: string
  category: string
  stock: number
  min_stock: number
  price: number
  location: string
  unit_of_measure?: string
  units_per_package?: number
  barcode?: string
}) {
  try {
    const { data: result, error } = await supabase
      .from('inventory_items')
      .insert([{
        license_id: data.license_id,
        item_code: data.item_code,
        name: data.name,
        category: data.category,
        current_stock: data.stock,
        minimum_stock: data.min_stock,
        unit_cost: data.price,
        location: data.location,
        unit_of_measure: data.unit_of_measure || 'unidades',
        units_per_package: data.units_per_package || 1,
        barcode: data.barcode || data.item_code || null,
      }])
      .select()

    if (error) throw error
    return result?.[0]
  } catch (error) {
    console.error('Error creating inventory item:', error)
    throw error
  }
}

export async function bulkRenameCategory(licenseId: string, oldCategory: string, newCategory: string) {
  try {
    const { error } = await supabase
      .from('inventory_items')
      .update({ category: newCategory })
      .eq('license_id', licenseId)
      .eq('category', oldCategory)
    
    if (error) throw error
    return true
  } catch (error) {
    console.error('Error renaming category:', error)
    throw error
  }
}

export async function updateInventoryItem(itemId: string, data: {
  item_code?: string
  name?: string
  category?: string
  stock?: number
  min_stock?: number
  price?: number
  location?: string
  unit_of_measure?: string
  units_per_package?: number
  barcode?: string
}, opts?: {
  userId?: string,
  justification?: string,
  purpose?: string
}) {
  try {
    const updateData: any = {}
    if (data.item_code !== undefined) updateData.item_code = data.item_code
    if (data.name !== undefined) updateData.name = data.name
    if (data.category !== undefined) updateData.category = data.category
    if (data.min_stock !== undefined) updateData.minimum_stock = data.min_stock
    if (data.price !== undefined) updateData.unit_cost = data.price
    if (data.location !== undefined) updateData.location = data.location
    if (data.unit_of_measure !== undefined) updateData.unit_of_measure = data.unit_of_measure
    if (data.units_per_package !== undefined) updateData.units_per_package = data.units_per_package
    if (data.barcode !== undefined) updateData.barcode = data.barcode

    // Special handling for stock to record movements
    let stockChange = 0
    let currentItem: any = null

    if (data.stock !== undefined) {
      // Fetch current stock to see if it changed
      const { data: item } = await supabase
        .from('inventory_items')
        .select('current_stock, license_id, item_code')
        .eq('id', itemId)
        .single()

      if (item) {
        currentItem = item
        stockChange = data.stock - (item.current_stock || 0)
        updateData.current_stock = data.stock
      }
    }

    const { data: result, error } = await supabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error

    // Record movement if stock changed, OR if it's a general edit and we want transparency
    if (stockChange !== 0 && currentItem) {
      await createInventoryMovement({
        license_id: currentItem.license_id,
        item_id: itemId,
        item_code: currentItem.item_code,
        change: Math.abs(stockChange),
        type: stockChange > 0 ? 'entrada' : 'salida',
        related_type: 'inventory_edit',
        user_id: opts?.userId,
        justification: opts?.justification || 'Edición manual de inventario',
        purpose: opts?.purpose || 'Ajuste de registro básico',
        notes: `Cambio manual de stock de ${currentItem.current_stock} a ${data.stock}`
      })
    } else if (opts?.userId && currentItem) {
      // Transparency: log item edit even if stock didn't change
      await createInventoryMovement({
        license_id: currentItem.license_id,
        item_id: itemId,
        item_code: currentItem.item_code,
        change: 0,
        type: 'ajuste',
        related_type: 'inventory_edit',
        user_id: opts?.userId,
        justification: 'Actualización de detalles del producto',
        purpose: 'Transparencia de catálogo',
        notes: `Edición de datos (ej. stock mínimo, categoría, código)`
      })
    }

    return result
  } catch (error) {
    console.error('Error updating inventory item:', error)
    throw error
  }
}

export async function deleteInventoryItem(itemId: string) {
  try {
    const { error } = await supabase
      .from('inventory_items')
      .update({ is_active: false })
      .eq('id', itemId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error in soft deleting inventory item:', error)
    throw error
  }
}

// Auto-generate next item code based on category prefix
const CATEGORY_PREFIXES: Record<string, string> = {
  'Librería': 'LIB',
  'Mobiliario': 'MOB',
  'Herramientas': 'HER',
  'Construcción': 'CON',
  'Comida': 'COM',
  'Utilería': 'UTI',
}

export async function getNextItemCode(licenseId: string, category: string): Promise<string> {
  try {
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    const prefix = CATEGORY_PREFIXES[category] || normalize(category).substring(0, 3) || 'GEN'

    // Buscamos todos los ítems que puedan tener este prefijo para encontrar el máximo correlativo
    const { data, error } = await supabase
      .from('inventory_items')
      .select('item_code, code, barcode')
      .eq('license_id', licenseId)
      // .eq('is_active', true) // También revisamos inactivos para no repetir códigos
      .or(`item_code.ilike.${prefix}%,code.ilike.${prefix}%,barcode.ilike.${prefix}%`)

    if (error) throw error

    let maxNum = 0
    if (data && data.length > 0) {
      data.forEach(item => {
        const codes = [item.item_code, item.code, item.barcode].filter(Boolean) as string[]
        codes.forEach(c => {
          if (c.toUpperCase().startsWith(prefix)) {
            // Extraer solo los números al final del código (ej. LIM-JAB001 -> 1, LIM-025 -> 25)
            const match = c.match(/(\d+)$/)
            if (match) {
              const num = parseInt(match[1], 10)
              if (num > maxNum) maxNum = num
            }
          }
        })
      })
    }

    const nextNum = maxNum + 1
    return `${prefix}-${String(nextNum).padStart(3, '0')}`
  } catch (error) {
    console.error('Error generating next item code:', error)
    const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
    const prefix = CATEGORY_PREFIXES[category] || normalize(category).substring(0, 3) || 'INV'
    return `${prefix}-${Date.now().toString().slice(-4)}`
  }
}

// Check if an item_code already exists for a license (for duplicate validation)
export async function checkItemCodeExists(licenseId: string, itemCode: string, excludeItemId?: string): Promise<boolean> {
  try {
    if (!itemCode || !itemCode.trim()) return false

    let query = supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('license_id', licenseId)
      .eq('item_code', itemCode.trim())

    if (excludeItemId) {
      query = query.neq('id', excludeItemId)
    }

    const { count, error } = await query
    if (error) throw error
    return (count || 0) > 0
  } catch (error) {
    console.error('Error checking item code:', error)
    return false
  }
}

// Find inventory item by barcode (for scanner)
export async function findInventoryItemByBarcode(licenseId: string, barcode: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, item_code, name, category, current_stock, minimum_stock, unit_cost, location, unit_of_measure, units_per_package, barcode')
      .eq('license_id', licenseId)
      .eq('barcode', barcode.trim())
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error finding item by barcode:', error)
    return null
  }
}

// ========== LÓGICA DE INVENTARIO AL APROBAR REQUISICIÓN ==========
export async function approveRequisitionAndReduceInventory(requisitionId: string, licenseId: string) {
  try {
    // 1. Obtener detalles de la requisición
    const { error: reqError } = await supabase
      .from('requisitions')
      .select('*')
      .eq('id', requisitionId)
      .single()

    if (reqError) throw reqError

    // 2. Obtener items de requisición (si existen en purchase_request_items)
    const { data: items, error: itemsError } = await supabase
      .from('purchase_request_items')
      .select('*')
      .eq('requisition_id', requisitionId)

    if (itemsError) throw itemsError

    // 3. Reducir inventario por cada item
    if (items && items.length > 0) {
      for (const item of items) {
        // Buscar el item en inventario por nombre o código
        const { data: invItem, error: invError } = await supabase
          .from('inventory_items')
          .select('*')
          .eq('license_id', licenseId)
          .eq('is_active', true)
          .ilike('name', `%${item.item_name}%`)
          .single()

        if (!invError && invItem) {
          const newStock = Math.max(0, (invItem.current_stock || 0) - (item.quantity || 1))
          await updateInventoryItem(invItem.id, { stock: newStock })
        }
      }
    }

    // 4. Actualizar estado de requisición
    const { error: updateError } = await supabase
      .from('requisitions')
      .update({ status: 'aprobada', updated_at: new Date().toISOString() })
      .eq('id', requisitionId)

    if (updateError) throw updateError
    return true
  } catch (error) {
    console.error('Error approving requisition and reducing inventory:', error)
    throw error
  }
}

// ============ INVENTORY IMPORT FUNCTIONS ============

export async function createInventoryImport(licenseId: string, userId: string, filename: string, totalRows: number) {
  try {
    const { data, error } = await supabase
      .from('inventory_imports')
      .insert([{
        license_id: licenseId,
        imported_by: userId,
        filename,
        total_rows: totalRows,
        status: 'en_progreso',
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating inventory import:', error)
    throw error
  }
}

export async function updateInventoryImport(importId: string, updates: any) {
  try {
    const { data, error } = await supabase
      .from('inventory_imports')
      .update(updates)
      .eq('id', importId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating inventory import:', error)
    throw error
  }
}

export async function saveImportError(importId: string, rowNumber: number, errorMessage: string, errorType: string, rowData: any) {
  try {
    const { error } = await supabase
      .from('inventory_import_errors')
      .insert([{
        import_id: importId,
        row_number: rowNumber,
        error_message: errorMessage,
        error_type: errorType,
        row_data: rowData,
      }])

    if (error) throw error
  } catch (error) {
    console.error('Error saving import error:', error)
    throw error
  }
}

export async function getInventoryImports(licenseId: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_imports')
      .select('*')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching inventory imports:', error)
    throw error
  }
}

export async function getImportErrors(importId: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_import_errors')
      .select('*')
      .eq('import_id', importId)
      .order('row_number', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching import errors:', error)
    throw error
  }
}

export async function saveColumnMapping(licenseId: string, userId: string, mappingName: string, mappingConfig: any) {
  try {
    const { data, error } = await supabase
      .from('inventory_column_mappings')
      .insert([{
        license_id: licenseId,
        created_by: userId,
        mapping_name: mappingName,
        mapping_config: mappingConfig,
      }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error saving column mapping:', error)
    throw error
  }
}

export async function getColumnMappings(licenseId: string) {
  try {
    const { data, error } = await supabase
      .from('inventory_column_mappings')
      .select('*')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching column mappings:', error)
    throw error
  }
}

export async function undoInventoryImport(importId: string) {
  try {
    // Obtener datos de la importación
    const { data: importData, error: fetchError } = await supabase
      .from('inventory_imports')
      .select('*')
      .eq('id', importId)
      .single()

    if (fetchError) throw fetchError
    if (!importData?.success_rows || !importData?.undo_data) {
      throw new Error('No se puede deshacer esta importación')
    }

    // Eliminar items importados (usando IDs guardados en undo_data)
    const itemIds = importData.undo_data.item_ids || []
    if (itemIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('inventory_items')
        .update({ is_active: false })
        .in('id', itemIds)

      if (deleteError) throw deleteError
    }

    // Marcar importación como deshecha
    await updateInventoryImport(importId, {
      status: 'completada',
      can_undo: false
    })

    return true
  } catch (error) {
    console.error('Error undoing inventory import:', error)
    throw error
  }
}

export async function downloadInventoryTemplate(_licenseId: string) {
  try {
    const template = {
      'Código*': 'LIB001',
      'Nombre*': 'Cuadernos A4',
      'Categoría*': 'Librería',
      'Stock Actual*': 50,
      'Stock Mínimo*': 10,
      'Costo Unitario*': 5000,
      'Ubicación': 'Estante A-1',
      'Descripción': 'Cuadernos rayados de 100 hojas',
    }
    return template
  } catch (error) {
    console.error('Error generating template:', error)
    throw error
  }
}

// Función para guardar historial de exportación de reportes
export async function saveReportExport(licenseId: string, reportType: string, format: string, exportedBy?: string) {
  try {
    const { error } = await supabase
      .from('report_exports')
      .insert([{
        license_id: licenseId,
        report_type: reportType,
        format,
        exported_by: exportedBy || null,
        exported_at: new Date().toISOString(),
      }])

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error saving report export:', error)
    throw error
  }
}

// Función para obtener historial de exportaciones
export async function getReportExportHistory(licenseId: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('report_exports')
      .select('*')
      .eq('license_id', licenseId)
      .order('exported_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching report export history:', error)
    throw error
  }
}

// ============================================
// MANEJO DE FACTURAS Y PRECIOS EN ÓRDENES
// ============================================

// Inicializar buckets necesarios
export async function initializeStorageBuckets() {
  try {
    const bucketName = 'purchase_order_invoices'
    console.log('✅ Storage buckets initialized. Bucket:', bucketName)
    // El bucket debe ser creado manualmente en Supabase usando el script SQL
  } catch (error) {
    console.error('Error initializing buckets:', error)
  }
}

// Subir factura a Supabase Storage
export async function uploadInvoiceFile(file: File, _orderId: string, _licenseId: string) {
  try {
    const bucketName = 'purchase_order_invoices'

    // Crear nombre único para el archivo
    const timestamp = Date.now()
    // Simplificar el nombre del archivo para evitar problemas de caracteres
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${safeName}`

    console.log('Uploading file:', fileName, 'to bucket:', bucketName)

    // Subir archivo a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading invoice file:', uploadError)
      throw uploadError
    }

    console.log('File uploaded successfully:', fileName)

    // Obtener URL pública del archivo
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      throw new Error('No se pudo obtener la URL pública del archivo')
    }

    console.log('Public URL obtained:', urlData.publicUrl)
    return urlData.publicUrl
  } catch (error) {
    console.error('Error in uploadInvoiceFile:', error)
    throw error
  }
}

// Subir cotización a Supabase Storage (Genérico)
export async function uploadQuotationFile(file: File) {
  try {
    const bucketName = 'purchase_order_invoices'
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `quotations/${timestamp}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error in uploadQuotationFile:', error)
    throw error
  }
}

// Actualizar precio definitivo y factura de orden de compra
export async function updatePurchaseOrderPrice(
  orderId: string,
  finalPrice: number,
  invoiceUrl: string
) {
  try {
    // 1. Obtener la orden actual para ver si ya tenía monto (opcional, para restar) 
    // y obtener el centro de costo.
    const { data: order, error: fetchError } = await supabase
      .from('purchase_orders')
      .select('cost_center_id, total_amount')
      .eq('id', orderId)
      .single()

    if (fetchError) throw fetchError

    // 2. Actualizar la orden
    console.log('💰 updatePurchaseOrderPrice [START]:', { orderId, finalPrice, type: typeof finalPrice });

    const { error } = await supabase
      .from('purchase_orders')
      .update({
        total_amount: finalPrice,
        invoice_url: invoiceUrl,
        price_confirmed_at: new Date().toISOString(),
        is_locked: true,
      })
      .eq('id', orderId)

    if (error) {
      console.error('❌ updatePurchaseOrderPrice [ERROR]:', error);
      throw error;
    }

    console.log('✅ updatePurchaseOrderPrice [SUCCESS]');

    // 3. Afectar Centro de Costo (Si existe)
    if (order.cost_center_id) {
      console.log('🔄 Afectando Presupuesto del Centro de Costo:', order.cost_center_id);

      const { data: cc } = await supabase
        .from('cost_centers')
        .select('budget_spent')
        .eq('id', order.cost_center_id)
        .single();

      if (cc) {
        // NOTA: Si ya habia un monto previo (ej. correccion), deberiamos restarlo antes de sumar el nuevo.
        // Asumiremos que si se edita, se reemplaza el impacto total. 
        // Sin embargo, si budget_spent es acumulativo global, es complejo.
        // Simplificación: Sumar la diferencia.

        const previousAmount = order.total_amount || 0;
        const difference = finalPrice - previousAmount;

        const newSpent = (cc.budget_spent || 0) + difference;

        await supabase
          .from('cost_centers')
          .update({ budget_spent: newSpent })
          .eq('id', order.cost_center_id);

        console.log('✅ Presupuesto actualizado. Nuevo gastado:', newSpent);
      }
    }

    return true
  } catch (error) {
    console.error('Error updating purchase order price:', error)
    throw error
  }
}

// Obtener detalles de factura de una orden
export async function getInvoiceDetails(orderId: string) {
  try {
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('id, order_number, total_amount, invoice_url, price_confirmed_at')
      .eq('id', orderId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching invoice details:', error)
    throw error
  }
}

// Procesar notificaciones pendientes: intenta enviar cada notificación y marcarla como enviada.
// - `sendFn` (opcional): función que realiza el envío real. Si no se provee, se simula con `console.log`.
export async function processPendingEmailNotifications(sendFn?: (notification: any) => Promise<boolean>) {
  try {
    const pending = await getPendingEmailNotifications()
    if (!pending || pending.length === 0) return 0

    let processed = 0
    for (const note of pending) {
      try {
        const success = sendFn ? await sendFn(note) : (console.log('Simulated send:', note), true)
        if (success) {
          // Intentar marcar como enviada; si falla, seguir con las siguientes
          try {
            await markEmailNotificationAsSent((note as any).id)
          } catch (err) {
            console.warn('No se pudo marcar notificación como enviada:', err)
          }
          processed++
        } else {
          console.warn('Envio fallido para notificación:', note)
        }
      } catch (err) {
        console.error('Error enviando notificación:', err)
      }
    }

    return processed
  } catch (error) {
    console.error('Error processing pending notifications:', error)
    throw error
  }
}

// ========== NOTIFICACIONES IN-APP (CAMPANITA) ==========
// Crear una notificación dentro de la app (tabla `notifications`).
export async function createInAppNotification(data: {
  license_id: string
  recipient_user_id?: string | null
  recipient_role?: string | null
  title: string
  message: string
  related_type?: string
  related_id?: string
  read?: boolean
}) {
  try {
    const { data: result, error } = await supabase
      .from('notifications')
      .insert([{
        license_id: data.license_id,
        recipient_user_id: data.recipient_user_id || null,
        recipient_role: data.recipient_role || null,
        title: data.title,
        message: data.message,
        related_type: data.related_type || null,
        related_id: data.related_id || null,
        read: data.read || false,
      }])
      .select()

    if (error) throw error
    return result?.[0]
  } catch (error) {
    console.error('Error creating in-app notification:', error)
    throw error
  }
}

// Obtener notificaciones in-app para un usuario
export async function getInAppNotifications(licenseId: string, userId: string, userRole?: string | null, limit = 50) {
  try {
    // Buscar notificaciones dirigidas al usuario o al rol del usuario
    const base = supabase
      .from('notifications')
      .select('*')
      .eq('license_id', licenseId)

    let query
    if (userRole) {
      // Usar OR para obtener notificaciones por usuario o por rol
      query = base.or(`recipient_user_id.eq.${userId},recipient_role.eq.${userRole}`)
    } else {
      query = base.eq('recipient_user_id', userId)
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching in-app notifications:', error)
    throw error
  }
}

// Notify targets by user IDs or by role. For each matching user: if user.email -> create email notification; else create in-app notification.
export async function notifyTargets(opts: {
  license_id: string
  userIds?: string[]
  role?: string
  title: string
  message: string
  related_type?: string
  related_id?: string
  created_by?: string
}) {
  try {
    const { license_id, userIds, role, title, message, related_type, related_id } = opts

    // Construir query de usuarios
    let usersQuery = supabase.from('users').select('*').eq('license_id', license_id).eq('is_active', true)
    if (userIds && userIds.length > 0) {
      usersQuery = usersQuery.in('id', userIds)
    } else if (role) {
      usersQuery = usersQuery.eq('role', role)
    } else {
      throw new Error('Se requiere userIds o role para notificar')
    }

    const { data: users, error: usersError } = await usersQuery
    if (usersError) throw usersError

    for (const u of users || []) {
      try {
        if (u.email) {
          // Crear notificación por email
          await createEmailNotification({
            license_id: license_id,
            recipient_email: u.email,
            subject: title,
            body: message,
            notification_type: 'in_app_or_email',
            related_id: related_id,
          })
        } else {
          // Crear notificación in-app específica para el usuario
          await createInAppNotification({
            license_id,
            recipient_user_id: u.id,
            title,
            message,
            related_type,
            related_id,
          })
        }
      } catch (innerErr) {
        console.error('Error notificando usuario:', u.id, innerErr)
      }
    }

    return true
  } catch (error) {
    console.error('Error in notifyTargets:', error)
    throw error
  }
}

// Suscribirse a notificaciones in-app en tiempo real.
// `onInsert` se invoca con el payload cuando hay una nueva notificación.
export function subscribeToInAppNotifications(_licenseId: string, userId: string, onInsert: (payload: any) => void) {
  try {
    const filter = `recipient_user_id=eq.${userId}`
    const channel = supabase
      .channel(`public:notifications:subscriber:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter }, (payload) => {
        onInsert(payload)
      })
      .subscribe()

    return channel
  } catch (error) {
    console.error('Error subscribing to in-app notifications:', error)
    throw error
  }
}

// Marcar notificación como leída
export async function markNotificationAsRead(notificationId: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

// ========== MOVIMIENTOS DE INVENTARIO (ENTRADAS / SALIDAS) ==========
export async function createInventoryMovement(data: {
  license_id: string
  item_id: string
  item_code?: string
  change: number
  type: 'entrada' | 'salida' | 'ajuste'
  related_type?: string
  related_id?: string
  user_id?: string
  notes?: string
  justification?: string
  purpose?: string
}) {
  try {
    const payload: any = {
      license_id: data.license_id,
      item_id: data.item_id,
      inventory_item_id: data.item_id, // Backward compatibility constraint
      movement_type: data.type, // Backward compatibility constraint
      quantity: data.change, // Backward compatibility constraint
      created_by: data.user_id || null, // Backward compatibility constraint
      item_code: data.item_code || null,
      change: data.change,
      type: data.type,
      related_type: data.related_type || null,
      reference_type: data.related_type || null, // Backward compatibility constraint
      related_id: data.related_id || null,
      reference_id: data.related_id || null, // Backward compatibility constraint
      user_id: data.user_id || null,
      notes: data.notes || null,
      justification: data.justification || null,
      purpose: data.purpose || null,
    }

    const { data: result, error } = await supabase
      .from('inventory_movements')
      .insert([payload])
      .select()

    if (error) throw error
    return result?.[0]
  } catch (error) {
    console.error('Error creating inventory movement:', error)
    throw error
  }
}

export async function getInventoryMovements(itemId: string, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('inventory_movements')
      .select('*, users(*)')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching inventory movements:', error)
    throw error
  }
}

// Modificar updateInventoryStock para registrar movement y audit log
export async function updateInventoryStock(
  inventoryItemId: string,
  quantity: number,
  operation: 'add' | 'subtract',
  opts?: {
    licenseId?: string;
    userId?: string;
    relatedType?: string;
    relatedId?: string;
    notes?: string;
    justification?: string;
    purpose?: string;
  }
) {
  try {
    // Obtener el stock actual
    const { data: current, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, current_stock, item_code, license_id')
      .eq('id', inventoryItemId)
      .single()

    if (fetchError) throw fetchError

    const prevStock = current?.current_stock || 0
    const newStock = operation === 'add' ? prevStock + quantity : Math.max(0, prevStock - quantity)

    const { data: result, error } = await supabase
      .from('inventory_items')
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', inventoryItemId)
      .select()

    if (error) throw error

    // Registrar movimiento
    try {
      await createInventoryMovement({
        license_id: opts?.licenseId || (current?.license_id as string) || '',
        item_id: inventoryItemId,
        item_code: current?.item_code || undefined,
        change: quantity,
        type: operation === 'add' ? 'entrada' : 'salida',
        related_type: opts?.relatedType,
        related_id: opts?.relatedId,
        user_id: opts?.userId,
        notes: opts?.notes,
        justification: opts?.justification,
        purpose: opts?.purpose,
      })
    } catch (movErr) {
      console.warn('No se pudo registrar movimiento de inventario:', movErr)
    }

    // Crear log de auditoría simplificado
    try {
      await createAuditLog(opts?.licenseId || (current?.license_id as string) || '', opts?.userId || '', `stock_${operation}`, 'inventory', inventoryItemId)
    } catch (logErr) {
      console.warn('No se pudo crear audit log para updateInventoryStock:', logErr)
    }

    return result
  } catch (error) {
    console.error('Error updating inventory stock:', error)
    throw error
  }
}

// ========== FUNCIONES DE PRESUPUESTOS ==========

export interface Budget {
  id: string
  license_id: string
  name: string
  category: string
  total_amount: number
  spent_amount: number
  remaining_amount: number
  start_date?: string
  end_date?: string
  description?: string
  status: 'activo' | 'completado' | 'pausado'
  created_at: string
}

// Obtener todos los presupuestos de una licencia
export async function getBudgets(licenseId: string): Promise<Budget[]> {
  try {
    if (!licenseId) {
      throw new Error('licenseId es requerido')
    }

    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching budgets:', error)
    throw error
  }
}

// Crear un nuevo presupuesto
export async function createBudget(
  licenseId: string,
  budgetData: {
    name: string
    category: string
    total_amount: number
    start_date?: string
    end_date?: string
    description?: string
  }
) {
  try {
    if (!licenseId || !budgetData.name || !budgetData.total_amount) {
      throw new Error('Faltan datos requeridos para crear presupuesto')
    }

    const { data, error } = await supabase
      .from('budgets')
      .insert([
        {
          license_id: licenseId,
          name: budgetData.name,
          category: budgetData.category,
          total_amount: budgetData.total_amount,
          spent_amount: 0,
          remaining_amount: budgetData.total_amount,
          start_date: budgetData.start_date,
          end_date: budgetData.end_date,
          description: budgetData.description,
          status: 'activo',
          created_at: new Date().toISOString(),
        },
      ])
      .select()

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    console.error('Error creating budget:', error)
    throw error
  }
}

// Actualizar un presupuesto
export async function updateBudget(
  budgetId: string,
  budgetData: {
    name?: string
    category?: string
    total_amount?: number
    status?: 'activo' | 'completado' | 'pausado'
    description?: string
  }
) {
  try {
    if (!budgetId) {
      throw new Error('budgetId es requerido')
    }

    // Recalcular remaining_amount si se cambia total_amount
    let updateData: any = { ...budgetData }
    if (budgetData.total_amount) {
      // Obtener spent_amount actual
      const { data: budget } = await supabase
        .from('budgets')
        .select('spent_amount')
        .eq('id', budgetId)
        .single()

      if (budget) {
        updateData = {
          ...updateData,
          remaining_amount: budgetData.total_amount - (budget.spent_amount || 0),
        }
      }
    }

    const { data, error } = await supabase
      .from('budgets')
      .update(updateData)
      .eq('id', budgetId)
      .select()

    if (error) throw error
    return data?.[0] || null
  } catch (error) {
    console.error('Error updating budget:', error)
    throw error
  }
}

// Eliminar un presupuesto
export async function deleteBudget(budgetId: string) {
  try {
    if (!budgetId) {
      throw new Error('budgetId es requerido')
    }

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', budgetId)

    if (error) throw error
  } catch (error) {
    console.error('Error deleting budget:', error)
    throw error
  }
}

// Obtener resumen de presupuestos con cálculos
export async function getBudgetSummary(licenseId: string) {
  try {
    if (!licenseId) {
      throw new Error('licenseId es requerido')
    }

    const { data, error } = await supabase
      .from('vw_budget_summary')
      .select('*')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching budget summary:', error)
    throw error
  }
}

// ============================================================
// FUNCIONES DE DESPACHO DE REQUISICIONES
// ============================================================

// Interface para resultado de despacho
export interface DispatchResult {
  success: boolean
  message: string
  items_dispatched?: Array<{
    item_id: string
    item_name: string
    item_code: string
    quantity_dispatched: number
    previous_stock: number
    new_stock: number
  }>
  new_balances?: Array<{
    item_code: string
    item_name: string
    new_balance: number
  }>
}

// Interface para deficit de items
export interface StockDeficit {
  item_id: string
  item_name: string
  item_code: string
  quantity_requested: number
  stock_available: number
  deficit: number
}

// Obtener detalles de requisición para despacho
export async function getRequisitionDispatchDetails(requisitionId: string, licenseId: string) {
  try {
    const { data, error } = await supabase
      .from('vw_requisition_dispatch_details')
      .select('*')
      .eq('requisition_id', requisitionId)

    if (error) throw error

    // Filtrar por licenseId verificando la requisición
    if (data && data.length > 0) {
      // Validar que la requisición pertenece a esta licencia
      const { data: req, error: reqError } = await supabase
        .from('requisitions')
        .select('id')
        .eq('id', requisitionId)
        .eq('license_id', licenseId)
        .single()

      if (reqError || !req) {
        throw new Error('Requisición no encontrada')
      }
    }

    return data || []
  } catch (error) {
    console.error('Error fetching dispatch details:', error)
    throw error
  }
}

// Procesar despacho de requisición (llamar RPC a PostgreSQL)
export async function dispatchRequisition(
  requisitionId: string,
  licenseId: string,
  userId: string
): Promise<DispatchResult> {
  try {
    const { data, error } = await supabase.rpc(
      'dispatch_requisition',
      {
        p_requisition_id: requisitionId,
        p_license_id: licenseId,
        p_user_id: userId
      }
    )

    if (error) {
      console.error('Error dispatching requisition:', error)
      throw new Error(error.message || 'Error al despachar requisición')
    }

    // Supabase RPC devuelve un array, tomar el primer elemento
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('Respuesta vacía del servidor')
    }

    const result = data[0]
    return {
      success: result.success,
      message: result.message,
      items_dispatched: result.items_dispatched || [],
      new_balances: result.new_balances || []
    }
  } catch (error) {
    console.error('Error in dispatchRequisition:', error)
    throw error
  }
}

// Obtener resumen de requisiciones listas para despacho
export async function getRequisitionsReadyForDispatch(licenseId: string) {
  try {
    const { data, error } = await supabase
      .from('vw_requisition_dispatch_summary')
      .select('*')
      .eq('license_id', licenseId)
      .eq('status', 'aprobada')

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching dispatch summary:', error)
    throw error
  }
}

// Insertar múltiples items en una requisición (utilizado cuando se crean desde el modal de despacho)
export async function addRequisitionItems(
  requisitionId: string,
  items: Array<{ inventory_item_id: string; quantity_requested: number }>
) {
  try {
    if (!items || items.length === 0) return []

    const payload = items.map(i => ({
      requisition_id: requisitionId,
      inventory_item_id: i.inventory_item_id,
      quantity_requested: i.quantity_requested,
      created_at: new Date().toISOString()
    }))

    const { data, error } = await supabase.from('requisition_items').insert(payload).select('*')
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error adding requisition items:', error)
    throw error
  }
}

// ============================================================

// ============================================
// MODULO DE ÓRDENES EXPRESS
// ============================================

export async function createExpressOrder(data: {
  license_id: string
  order_number: string
  created_by: string
  department?: string
  estimated_total: number
  justification: string
  payment_method: string
  payment_reference?: string // Estandarizado
  cheque_number?: string // Deprecado, usar payment_reference
  transfer_reference?: string // Deprecado, usar payment_reference
  payment_date?: string
  items: any[]
}) {
  try {
    // 1. Create Order Header
    const { data: order, error: orderError } = await supabase
      .from('express_purchase_orders')
      .insert([{
        license_id: data.license_id,
        order_number: data.order_number,
        created_by: data.created_by,
        department: data.department,
        estimated_total: data.estimated_total,
        justification: data.justification,
        payment_method: data.payment_method,
        payment_reference: data.payment_reference || data.cheque_number || data.transfer_reference || '',
        payment_date: data.payment_date,
        status: 'draft'
      }])
      .select()
      .single()

    if (orderError) throw orderError

    // 2. Create Items
    if (data.items && data.items.length > 0) {
      const itemsToInsert = data.items.map(item => ({
        express_order_id: order.id,
        item_number: item.item_number,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        units_per_package: item.units_per_package || 1,
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name,
        estimated_unit_price: item.estimated_unit_price,
      }))

      const { error: itemsError } = await supabase
        .from('express_order_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError
    }

    return order
  } catch (error) {
    console.error('Error creating express order:', error)
    throw error
  }
}

export async function getExpressOrders(licenseId: string) {
  try {
    // Simple select, no FK joins
    const { data, error } = await supabase
      .from('express_purchase_orders')
      .select('*')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!data || data.length === 0) return []

    // Fetch creators separately
    const creatorIds = [...new Set(data.map(o => o.created_by).filter(Boolean))]
    let creatorsMap = new Map<string, any>()
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase.from('users').select('id, full_name').in('id', creatorIds)
      if (creators) creatorsMap = new Map(creators.map(u => [u.id, u]))
    }

    // Fetch items count per order
    const orderIds = data.map(o => o.id)
    let itemsCountMap = new Map<string, number>()
    if (orderIds.length > 0) {
      const { data: items } = await supabase.from('express_order_items').select('id, express_order_id').in('express_order_id', orderIds)
      if (items) {
        for (const item of items) {
          itemsCountMap.set(item.express_order_id, (itemsCountMap.get(item.express_order_id) || 0) + 1)
        }
      }
    }

    return data.map(order => ({
      ...order,
      creator: creatorsMap.get(order.created_by) || { full_name: 'Desconocido' },
      items_count: itemsCountMap.get(order.id) || 0
    }))
  } catch (error) {
    console.error('Error fetching express orders:', error)
    throw error
  }
}

export async function getExpressOrderById(orderId: string) {
  try {
    // Simple select for the order
    const { data: order, error } = await supabase
      .from('express_purchase_orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (error) throw error
    if (!order) throw new Error('Order not found')

    // Fetch creator
    let creator = null
    if (order.created_by) {
      const { data: u } = await supabase.from('users').select('full_name, email, department').eq('id', order.created_by).single()
      creator = u
    }

    // Fetch items
    const { data: items } = await supabase
      .from('express_order_items')
      .select('*')
      .eq('express_order_id', orderId)
      .order('item_number', { ascending: true })

    // Fetch approvals  
    const { data: approvals } = await supabase
      .from('purchase_order_approvals')
      .select('*')
      .eq('express_order_id', orderId)

    return {
      ...order,
      creator,
      items: items || [],
      approvals: approvals || []
    }
  } catch (error) {
    console.error('Error fetching express order details:', error)
    throw error
  }
}

export async function updateExpressOrder(orderId: string, updates: any) {
  try {
    const { data, error } = await supabase
      .from('express_purchase_orders')
      .update(updates)
      .eq('id', orderId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating express order:', error)
    throw error
  }
}

export async function confirmExpressOrderAmounts(orderId: string, data: {
  real_total: number
  difference_amount: number
  difference_percentage: number
  difference_justification?: string
  items: { id: string, real_unit_price: number, real_subtotal: number }[]
}) {
  try {
    const { error: orderError } = await supabase
      .from('express_purchase_orders')
      .update({
        status: 'completed',
        real_total: data.real_total,
        difference_amount: data.difference_amount,
        difference_percentage: data.difference_percentage,
        difference_justification: data.difference_justification,
        payment_date: new Date().toISOString()
      })
      .eq('id', orderId)

    if (orderError) throw orderError

    for (const item of data.items) {
      const { error: itemError } = await supabase
        .from('express_order_items')
        .update({
          real_unit_price: item.real_unit_price,
          real_subtotal: item.real_subtotal
        })
        .eq('id', item.id)

      if (itemError) throw itemError
    }

    return true
  } catch (error) {
    console.error('Error confirming express order amounts:', error)
    throw error
  }
}

export async function sendExpressOrderToReview(orderId: string) {
  try {
    const { error: orderError } = await supabase
      .from('express_purchase_orders')
      .update({
        status: 'pending_approval',
        is_locked: true
      })
      .eq('id', orderId)

    if (orderError) throw orderError

    const roles = ['jefe_presupuesto', 'jefe_operaciones', 'jefe_calidad']
    const approvals = roles.map(role => ({
      express_order_id: orderId,
      approver_role: role,
      status: 'pending'
    }))

    const { error: approvalError } = await supabase
      .from('purchase_order_approvals')
      .insert(approvals)

    if (approvalError) throw approvalError

    return true
  } catch (error) {
    console.error('Error sending express order to review:', error)
    throw error
  }
}

export async function getNextExpressOrderNumber(licenseId: string): Promise<string> {
  try {
    const year = new Date().getFullYear();
    const prefix = `EXP-${year}-`;

    const { data, error } = await supabase
      .from('express_purchase_orders')
      .select('order_number')
      .eq('license_id', licenseId)
      .ilike('order_number', `${prefix}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    let nextNum = 1;
    if (data && data.length > 0) {
      const lastNum = parseInt(data[0].order_number.replace(prefix, ''));
      if (!isNaN(lastNum)) nextNum = lastNum + 1;
    }

    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating express order number:', error);
    return `EXP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
  }
}
// COST CENTERS & ENHANCED REQUISITIONS
// ============================================================

export interface CostCenter {
  id: string
  license_id: string
  code: string
  name: string
  description?: string
  department?: string | null
  budget_id?: string | null // Linked Master Budget
  budget_allocated: number
  budget_spent: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface RequisitionItem {
  id?: string
  requisition_id?: string
  inventory_item_id?: string
  item_name: string
  quantity: number
  quantity_delivered?: number
  unit_of_measure: string
  units_per_package?: number
  estimated_unit_cost?: number
  notes?: string
}

// Get all cost centers for a license
export async function getCostCenters(licenseId: string): Promise<CostCenter[]> {
  try {
    const { data, error } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('license_id', licenseId)
      .eq('is_active', true)
      .order('code', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching cost centers:', error)
    throw error
  }
}

// Create a new cost center
export async function createCostCenter(costCenter: Omit<CostCenter, 'id' | 'created_at' | 'updated_at' | 'budget_spent'>) {
  try {
    const { data, error } = await supabase
      .from('cost_centers')
      .insert({
        ...costCenter,
        budget_spent: 0
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating cost center:', error)
    throw error
  }
}

// Assign cost center to requisition (Finance role only)
export async function assignCostCenter(requisitionId: string, costCenterId: string) {
  try {
    // First get the cost center details
    const { data: costCenter, error: ccError } = await supabase
      .from('cost_centers')
      .select('code, name')
      .eq('id', costCenterId)
      .single()

    if (ccError) throw ccError

    // Update requisition with cost center info
    const { data, error } = await supabase
      .from('requisitions')
      .update({
        cost_center_id: costCenterId,
        cost_center_code: costCenter.code,
        cost_center_name: costCenter.name,
        status: 'en_revision' // Move to review after cost center assignment
      })
      .eq('id', requisitionId)
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error assigning cost center:', error)
    throw error
  }
}

// Get items for a specific requisition
export async function getRequisitionItems(requisitionId: string): Promise<RequisitionItem[]> {
  try {
    const { data, error } = await supabase
      .from('requisition_items')
      .select('*')
      .eq('requisition_id', requisitionId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching requisition items:', error)
    throw error
  }
}

// ============================================
// ENTREGA DE REQUISICIONES (DISPATCH)
// ============================================

/**
 * Confirma la entrega física (parcial o total) de una requisición
 */
export async function confirmRequisitionDelivery(data: {
  license_id: string
  requisition_id: string
  dispatched_by: string
  received_by_name: string
  signature_url?: string
  notes?: string
  items: Array<{
    requisition_item_id: string
    inventory_item_id: string | null
    quantity: number
  }>
}) {
  try {
    const { data: result, error } = await supabase.rpc('confirm_requisition_delivery', {
      p_license_id: data.license_id,
      p_requisition_id: data.requisition_id,
      p_dispatched_by: data.dispatched_by,
      p_received_by_name: data.received_by_name,
      p_signature_url: data.signature_url || null,
      p_notes: data.notes || '',
      p_items: data.items
    })

    if (error) throw error
    return result
  } catch (error) {
    console.error('Error in confirmRequisitionDelivery:', error)
    throw error
  }
}

/**
 * Obtiene el historial de despachos de una requisición
 */
export async function getRequisitionDispatches(requisitionId: string) {
  try {
    const { data, error } = await supabase
      .from('requisition_dispatches')
      .select('*, dispatched_by_user:users!dispatched_by(full_name)')
      .eq('requisition_id', requisitionId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error in getRequisitionDispatches:', error)
    throw error
  }
}

/**
 * Obtiene los items entregados en un despacho específico
 */
export async function getRequisitionDispatchItems(dispatchId: string) {
  try {
    const { data, error } = await supabase
      .from('requisition_dispatch_items')
      .select(`
        *,
        requisition_items (
          item_name,
          unit_of_measure
        )
      `)
      .eq('dispatch_id', dispatchId)

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error in getRequisitionDispatchItems:', error)
    throw error
  }
}

// Create a new requisition with multiple items
export async function createRequisitionWithItems(
  licenseId: string,
  userId: string,
  requisitionData: {
    priority: string
    justification: string
    estimated_amount: number
  },
  items: RequisitionItem[]
) {
  try {
    // 0. Get user's department for auto CC assignment
    let cost_center_id = null
    const { data: userData } = await supabase
      .from('users')
      .select('department')
      .eq('id', userId)
      .single()

    if (userData?.department) {
      // Find cost center matching user's department
      const { data: costCenter } = await supabase
        .from('cost_centers')
        .select('id')
        .eq('license_id', licenseId)
        .eq('department', userData.department)
        .eq('is_active', true)
        .single()

      cost_center_id = costCenter?.id || null
    }

    // 1. Get next requisition number
    const { data: nextNumber, error: numberError } = await supabase
      .rpc('get_next_requisition_number', { p_license_id: licenseId })

    if (numberError) throw numberError

    // 2. Create requisition with auto-assigned cost center
    const { data: requisition, error: reqError } = await supabase
      .from('requisitions')
      .insert({
        license_id: licenseId,
        user_id: userId,
        created_by: userId,
        requisition_number: nextNumber,
        priority: requisitionData.priority,
        justification: requisitionData.justification,
        estimated_amount: requisitionData.estimated_amount,
        cost_center_id: cost_center_id,
        status: 'pendiente'
      })
      .select()
      .single()

    if (reqError) throw reqError

    // 3. Insert items
    if (items.length > 0) {
      const itemsToInsert = items.map(item => ({
        requisition_id: requisition.id,
        inventory_item_id: item.inventory_item_id || null,
        item_name: item.item_name,
        quantity_requested: item.quantity,
        unit_of_measure: item.unit_of_measure,
        units_per_package: item.units_per_package || 1,
        estimated_unit_cost: item.estimated_unit_cost || 0,
        notes: item.notes || null
      }))

      const { error: itemsError } = await supabase
        .from('requisition_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError
    }

    return requisition
  } catch (error) {
    console.error('Error creating requisition with items:', error)
    throw error
  }
}
// ============================================
// JEFATURAS DASHBOARD HELPERS
// ============================================

export async function getPendingApprovalsForUser(role: string) {
  try {
    // 1. Get my pending approval records
    const { data: approvals, error } = await supabase
      .from('purchase_order_approvals')
      .select('*')
      .eq('approver_role', role)
      .eq('status', 'pending')

    if (error) throw error
    if (!approvals || approvals.length === 0) return []

    // 2. Separate standard vs express approvals
    const standardApprovals = approvals.filter(a => a.purchase_order_id)
    const expressApprovals = approvals.filter(a => a.express_order_id)

    const results: any[] = []

    // ========================================
    // 3A. STANDARD PURCHASE ORDERS
    // ========================================
    if (standardApprovals.length > 0) {
      const orderIds = standardApprovals.map(a => a.purchase_order_id)
      let ordersMap = new Map<string, any>()

      const { data: orders, error: ordErr } = await supabase
        .from('purchase_orders')
        .select('*')
        .in('id', orderIds)

      if (ordErr) console.warn('Error fetching orders:', ordErr)

      if (orders && orders.length > 0) {
        const supplierIds = orders.map(o => o.supplier_id).filter(Boolean)
        const creatorIds = orders.map(o => o.created_by).filter(Boolean)
        const requestIds = orders.map(o => o.purchase_request_id).filter(Boolean)

        let suppliersMap = new Map<string, any>()
        let creatorsMap = new Map<string, any>()
        let requestsMap = new Map<string, any>()

        try {
          if (supplierIds.length > 0) {
            const { data: suppliers } = await supabase.from('suppliers').select('id, name').in('id', supplierIds)
            if (suppliers) suppliersMap = new Map(suppliers.map(s => [s.id, s]))
          }
        } catch (e) { console.warn('Error fetching suppliers:', e) }

        try {
          if (creatorIds.length > 0) {
            const { data: creators } = await supabase.from('users').select('id, full_name, department').in('id', creatorIds)
            if (creators) creatorsMap = new Map(creators.map(u => [u.id, u]))
          }
        } catch (e) { console.warn('Error fetching creators:', e) }

        try {
          if (requestIds.length > 0) {
            const { data: requests } = await supabase.from('purchase_requests').select('id, justification').in('id', requestIds)
            if (requests) requestsMap = new Map(requests.map(r => [r.id, r]))
          }
        } catch (e) { console.warn('Error fetching requests:', e) }

        for (const order of orders) {
          const supplier = suppliersMap.get(order.supplier_id)
          const creator = creatorsMap.get(order.created_by)
          const request = requestsMap.get(order.purchase_request_id)
          ordersMap.set(order.id, {
            ...order,
            supplier_name: supplier?.name || 'N/A',
            creator_name: creator?.full_name || 'Desconocido',
            creator_department: creator?.department || order.department || 'General',
            request_description: request?.description || request?.justification || ''
          })
        }
      }

      for (const a of standardApprovals) {
        const order = ordersMap.get(a.purchase_order_id)
        results.push({
          id: a.id,
          order_id: order?.id || a.purchase_order_id,
          order_number: order?.order_number || 'ORD-???',
          type: 'standard',
          created_at: order?.created_at || a.created_at,
          total_amount: order?.total_amount || 0,
          requester: order?.creator_name || 'Desconocido',
          department: order?.creator_department || 'General',
          supplier: order?.supplier_name || 'N/A',
          justification: order?.internal_notes || order?.request_description || '',
          items: [],
          receipt_files: [],
          quotation_url: order?.quotation_url || '',
          payment_method: order?.payment_method || '',
          payment_reference: order?.payment_reference || '',
          price_confirmed_at: order?.price_confirmed_at || null,
          status: order?.status || 'pending'
        })
      }
    }

    // ========================================
    // 3B. EXPRESS PURCHASE ORDERS
    // ========================================
    if (expressApprovals.length > 0) {
      const expressIds = expressApprovals.map(a => a.express_order_id)

      // Fetch express orders
      const { data: expressOrders } = await supabase
        .from('express_purchase_orders')
        .select('*')
        .in('id', expressIds)

      let expressMap = new Map<string, any>()
      if (expressOrders && expressOrders.length > 0) {
        // Fetch creators
        const creatorIds = [...new Set(expressOrders.map(o => o.created_by).filter(Boolean))]
        let creatorsMap = new Map<string, any>()
        try {
          if (creatorIds.length > 0) {
            const { data: creators } = await supabase.from('users').select('id, full_name, department').in('id', creatorIds)
            if (creators) creatorsMap = new Map(creators.map(u => [u.id, u]))
          }
        } catch (e) { console.warn('Error fetching express creators:', e) }

        // Fetch items for all express orders
        let itemsMap = new Map<string, any[]>()
        try {
          const { data: items } = await supabase
            .from('express_order_items')
            .select('*')
            .in('express_order_id', expressIds)
            .order('item_number', { ascending: true })

          if (items) {
            for (const item of items) {
              if (!itemsMap.has(item.express_order_id)) itemsMap.set(item.express_order_id, [])
              itemsMap.get(item.express_order_id)!.push(item)
            }
          }
        } catch (e) { console.warn('Error fetching express items:', e) }

        for (const order of expressOrders) {
          const creator = creatorsMap.get(order.created_by)
          const orderItems = itemsMap.get(order.id) || []

          // Build supplier summary from items
          const supplierNames = [...new Set(orderItems.map(i => i.supplier_name).filter(Boolean))]

          expressMap.set(order.id, {
            ...order,
            creator_name: creator?.full_name || 'Desconocido',
            creator_department: creator?.department || order.department || 'Compras',
            supplier_summary: supplierNames.length > 0 ? supplierNames.join(', ') : 'Varios',
            items: orderItems
          })
        }
      }

      for (const a of expressApprovals) {
        const order = expressMap.get(a.express_order_id)
        results.push({
          id: a.id,
          order_id: order?.id || a.express_order_id,
          order_number: order?.order_number || 'EXP-???',
          type: 'express',
          created_at: order?.created_at || a.created_at,
          total_amount: order?.estimated_total || 0,
          requester: order?.creator_name || 'Desconocido',
          department: order?.creator_department || 'Compras',
          supplier: order?.supplier_summary || 'Varios',
          justification: order?.justification || '',
          payment_method: order?.payment_method || '',
          payment_reference: order?.payment_reference || '',
          receipt_files: order?.receipt_files || [],
          items: (order?.items || []).map((it: any) => ({
            description: it.description,
            quantity: it.quantity,
            unit: it.unit,
            units_per_package: it.units_per_package || 1,
            supplier_name: it.supplier_name,
            unit_price: it.estimated_unit_price,
            estimated_price: it.estimated_unit_price,
            subtotal: it.estimated_subtotal || (it.quantity * it.estimated_unit_price)
          })),
          status: order?.status || 'pending'
        })
      }
    }

    return results.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  } catch (error) {
    console.error('Error fetching pending approvals:', error)
    return []
  }
}

export async function getApprovalStats(role: string) {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Pending
    const { count: pendingCount } = await supabase
      .from('purchase_order_approvals')
      .select('id', { count: 'exact', head: true })
      .eq('approver_role', role)
      .eq('status', 'pending')

    // Approved Month
    const { count: approvedCount } = await supabase
      .from('purchase_order_approvals')
      .select('id', { count: 'exact', head: true })
      .eq('approver_role', role)
      .eq('status', 'approved')
      .gte('approved_at', firstDayOfMonth)

    // Rejected Month
    const { count: rejectedCount } = await supabase
      .from('purchase_order_approvals')
      .select('id', { count: 'exact', head: true })
      .eq('approver_role', role)
      .eq('status', 'rejected')
      .gte('rejected_at', firstDayOfMonth)

    return {
      pending: pendingCount || 0,
      approvedMonth: approvedCount || 0,
      rejectedMonth: rejectedCount || 0
    }

  } catch (error) {
    console.error('Error fetching stats:', error)
    return { pending: 0, approvedMonth: 0, rejectedMonth: 0 }
  }
}

// =============================================
// EXPRESS ORDER INVOICE UPLOADS
// =============================================

export async function uploadExpressOrderInvoice(
  orderId: string,
  file: File
): Promise<string> {
  try {
    const fileName = `express/${orderId}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('purchase_order_invoices')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('purchase_order_invoices')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading invoice:', error)
    throw error
  }
}

export async function deleteExpressOrderInvoice(fileUrl: string): Promise<void> {
  try {
    // Extract path from full URL
    const path = fileUrl.split('/purchase_order_invoices/')[1]
    if (!path) return

    const { error } = await supabase.storage
      .from('purchase_order_invoices')
      .remove([decodeURIComponent(path)])

    if (error) throw error
  } catch (error) {
    console.error('Error deleting invoice:', error)
    throw error
  }
}

export async function updateExpressOrderFiles(
  orderId: string,
  fileUrls: string[]
): Promise<void> {
  try {
    const { error } = await supabase
      .from('express_purchase_orders')
      .update({ receipt_files: fileUrls, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) throw error
  } catch (error) {
    console.error('Error updating order files:', error)
    throw error
  }
}

// EXPRESS ORDER QUOTATION UPLOADS
export async function uploadExpressOrderQuotation(
  orderId: string,
  file: File
): Promise<string> {
  try {
    const fileName = `quotations/${orderId}/${Date.now()}_${file.name}`

    const { error: uploadError } = await supabase.storage
      .from('purchase_order_invoices')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('purchase_order_invoices')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading quotation:', error)
    throw error
  }
}

export async function updateExpressOrderQuotations(
  orderId: string,
  fileUrls: string[]
): Promise<void> {
  try {
    const { error } = await supabase
      .from('express_purchase_orders')
      .update({ quotation_files: fileUrls, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) throw error
  } catch (error) {
    console.error('Error updating order quotations:', error)
    throw error
  }
}

// EXPRESS ORDER DELIVERY SIGNATURE
export async function uploadExpressOrderSignature(
  orderId: string,
  signatureDataUrl: string
): Promise<string> {
  try {
    // Basic canvas check
    if (!signatureDataUrl || signatureDataUrl.length < 100) {
      throw new Error('Firma inválida')
    }

    // Convert base64 to blob
    const res = await fetch(signatureDataUrl)
    const blob = await res.blob()
    const fileName = `signatures/express/${orderId}_${Date.now()}.png`

    const { error: uploadError } = await supabase.storage
      .from('purchase_order_invoices')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from('purchase_order_invoices')
      .getPublicUrl(fileName)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error uploading express order signature:', error)
    throw error
  }
}

export async function confirmExpressOrderDelivery(data: {
  orderId: string
  receivedByName: string
  signatureUrl: string
}) {
  try {
    const { error } = await supabase
      .from('express_purchase_orders')
      .update({
        status: 'completed', // Or a new status if preferred, but user said "entrega" is the last step
        delivered_at: new Date().toISOString(),
        delivered_to_name: data.receivedByName,
        delivered_signature_url: data.signatureUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.orderId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error confirming express order delivery:', error)
    throw error
  }
}

// NOTIFICACIONES DE RECOJO
export async function notifyOrderPickup(orderId: string, licenseId: string, recipientUserId: string) {
  try {
    // 1. Obtener email del destinatario
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', recipientUserId)
      .single()

    if (userError) throw userError

    // 2. Insertar notificación In-App
    const { error: inAppError } = await supabase
      .from('notifications')
      .insert({
        license_id: licenseId,
        recipient_user_id: recipientUserId,
        title: 'Pedido listo para recojo',
        message: `Su pedido de la orden ${orderId} ya está disponible para ser recogido.`,
        related_type: 'purchase_order',
        related_id: orderId
      })

    if (inAppError) throw inAppError

    // 3. Insertar notificación por Email
    if (userData?.email) {
      await supabase
        .from('email_notifications')
        .insert({
          license_id: licenseId,
          recipient_email: userData.email,
          subject: `🛒 Pedido Listo para Recojo - Orden ${orderId}`,
          body: `Hola ${userData.full_name},\n\nLe informamos que su pedido relacionado a la orden de compra ${orderId} ya se encuentra disponible para ser recogido.\n\nPor favor, pase a retirarlo a la brevedad.\n\nAtentamente,\nSistema de Compras MAO`,
          sent: false
        })
    }

    return true
  } catch (error) {
    console.error('Error notifying order pickup:', error)
    throw error
  }
}

// CONFIRMACIÓN DE ENTREGA (ESTÁNDAR)
export async function confirmOrderDelivery(data: {
  orderId: string
  receivedByName: string
  signatureUrl: string
}) {
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'completada',
        delivered_at: new Date().toISOString(),
        delivered_to_name: data.receivedByName,
        delivered_signature_url: data.signatureUrl,
        is_locked: true // Bloqueo automático
      })
      .eq('id', data.orderId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error confirming order delivery:', error)
    throw error
  }
}
