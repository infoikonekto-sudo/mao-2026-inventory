import { z } from 'zod'
import { VALIDATION_MESSAGES } from '@/constants'

/**
 * Esquema de validación para login
 */
export const loginSchema = z.object({
  authCode: z.string()
    .min(1, VALIDATION_MESSAGES.REQUIRED)
    .regex(/^[A-Z0-9-]+$/, VALIDATION_MESSAGES.INVALID_AUTH_CODE),
})

/**
 * Esquema de validación para crear requisición
 */
export const requisitionSchema = z.object({
  department: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  priority: z.enum(['baja', 'media', 'alta', 'urgente']),
  notes: z.string().optional(),
  items: z.array(z.object({
    item_id: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
    quantity_requested: z.number().min(1, 'La cantidad debe ser mayor a 0'),
  })).min(1, 'Debe agregar al menos un item'),
})

/**
 * Esquema de validación para crear solicitud de compra
 */
export const purchaseRequestSchema = z.object({
  department: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  justification: z.string().min(10, 'La justificación debe tener al menos 10 caracteres'),
  estimated_amount: z.number().min(0.01, VALIDATION_MESSAGES.INVALID_AMOUNT),
  items: z.array(z.object({
    item_name: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
    description: z.string().optional(),
    quantity: z.number().min(1, VALIDATION_MESSAGES.INVALID_STOCK),
    estimated_unit_price: z.number().min(0.01, VALIDATION_MESSAGES.INVALID_AMOUNT),
    category: z.string().optional(),
  })).min(1, 'Debe agregar al menos un item'),
})

/**
 * Esquema de validación para crear orden de compra
 */
export const purchaseOrderSchema = z.object({
  supplier_id: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  purchase_request_id: z.string().optional(),
  payment_terms: z.string().optional(),
  delivery_address: z.string().optional(),
  expected_delivery_date: z.string().optional(),
  notes: z.string().optional(),
})

/**
 * Esquema de validación para crear item de inventario
 */
export const inventoryItemSchema = z.object({
  item_code: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  name: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  description: z.string().optional(),
  category_id: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  unit_of_measure: z.string().min(1, VALIDATION_MESSAGES.REQUIRED),
  unit_cost: z.number().min(0, VALIDATION_MESSAGES.INVALID_AMOUNT),
  minimum_stock: z.number().min(0, 'El stock mínimo no puede ser negativo'),
  location: z.string().optional(),
})
