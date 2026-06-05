import { useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'
import { RealtimeChannel } from '@supabase/supabase-js'

type PurchaseRequestUpdateCallback = (id: string, updatedFields: any) => void

/**
 * Hook para suscribirse a cambios en tiempo real de solicitudes de compra y sus items
 * Actualiza el estado local sin recargar TODO desde BD
 */
export function usePurchaseRequestRealtime(
  licenseId: string,
  userId: string | undefined,
  onPurchaseRequestUpdate: PurchaseRequestUpdateCallback,
  onPurchaseRequestItemUpdate?: PurchaseRequestUpdateCallback
) {
  useEffect(() => {
    if (!licenseId) return

    const channels: RealtimeChannel[] = []

    const setupSubscriptions = (retryCount = 0) => {
      // 1. Suscribirse a cambios en purchase_requests (UPDATE)
      const prChannel = supabase
        .channel(`purchase-requests-updates-${licenseId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'purchase_requests',
            filter: `license_id=eq.${licenseId}`,
          },
          (payload) => {
            onPurchaseRequestUpdate(payload.new.id, payload.new)
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`Realtime error on Purchase Requests:`, err?.message)
            if (retryCount < 5) setTimeout(() => setupSubscriptions(retryCount + 1), Math.pow(2, retryCount) * 1000)
          }
        })
      channels.push(prChannel)

      // 2. Suscribirse a cambios en purchase_request_items (UPDATE)
      if (onPurchaseRequestItemUpdate) {
        const itemChannel = supabase
          .channel(`purchase-request-items-updates-${licenseId}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'purchase_request_items',
            },
            (payload) => {
              onPurchaseRequestItemUpdate(payload.new.purchase_request_id, {
                itemId: payload.new.id,
                ...payload.new,
              })
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn(`Realtime error on Purchase Request Items:`, err?.message)
              if (retryCount < 5) setTimeout(() => setupSubscriptions(retryCount + 1), Math.pow(2, retryCount) * 1000)
            }
          })
        channels.push(itemChannel)
      }
    }

    setupSubscriptions()

    return () => {
      channels.forEach(ch => {
        supabase.removeChannel(ch)
      })
    }
  }, [licenseId, userId, onPurchaseRequestUpdate, onPurchaseRequestItemUpdate])
}
