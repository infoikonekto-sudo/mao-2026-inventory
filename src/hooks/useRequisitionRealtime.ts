import { useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'
import { RealtimeChannel } from '@supabase/supabase-js'

type RequisitionUpdateCallback = (id: string, updatedFields: any) => void

/**
 * Hook para suscribirse a cambios en tiempo real de requisiciones y sus items
 * Actualiza el estado local sin recargar TODO desde BD
 */
export function useRequisitionRealtime(
  licenseId: string,
  userId: string | undefined,
  onRequisitionUpdate: RequisitionUpdateCallback,
  onRequisitionItemUpdate?: RequisitionUpdateCallback
) {
  useEffect(() => {
    if (!licenseId) return

    const channels: RealtimeChannel[] = []

    const setupSubscriptions = (retryCount = 0) => {
      // 1. Suscribirse a cambios en requisitions (UPDATE)
      const reqChannel = supabase
        .channel(`requisitions-updates-${licenseId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'requisitions',
            filter: `license_id=eq.${licenseId}`,
          },
          (payload) => {
            onRequisitionUpdate(payload.new.id, payload.new)
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`Realtime error on Requisitions:`, err?.message)
            if (retryCount < 5) setTimeout(() => setupSubscriptions(retryCount + 1), Math.pow(2, retryCount) * 1000)
          }
        })
      channels.push(reqChannel)

      // 2. Suscribirse a cambios en requisition_items (UPDATE)
      if (onRequisitionItemUpdate) {
        const itemChannel = supabase
          .channel(`requisition-items-updates-${licenseId}-${Date.now()}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'requisition_items',
            },
            (payload) => {
              onRequisitionItemUpdate(payload.new.requisition_id, {
                itemId: payload.new.id,
                ...payload.new,
              })
            }
          )
          .subscribe((status, err) => {
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.warn(`Realtime error on Requisition Items:`, err?.message)
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
  }, [licenseId, userId, onRequisitionUpdate, onRequisitionItemUpdate])
}
