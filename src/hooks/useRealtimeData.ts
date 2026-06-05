import { useEffect } from 'react'
import { supabase } from '@/services/supabaseClient'
import { RealtimeChannel } from '@supabase/supabase-js'

type RealtimeCallback = (data: any) => void

export function useRealtimeData(
  tableName: string,
  licenseId: string,
  onDataChange: RealtimeCallback,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
) {
  useEffect(() => {
    if (!licenseId) return

    let channel: RealtimeChannel

    const setupListener = (retryCount = 0) => {
      channel = supabase
        .channel(`${tableName}-${licenseId}-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event,
            schema: 'public',
            table: tableName,
            filter: `license_id=eq.${licenseId}`,
          },
          (payload) => {
            onDataChange(payload)
          }
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn(`Realtime error/timeout on ${tableName}:`, err?.message || 'WebSocket issue')
            if (retryCount < 5) {
              const delay = Math.pow(2, retryCount) * 1000
              setTimeout(() => setupListener(retryCount + 1), delay)
            }
          }
        })
    }

    setupListener()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [tableName, licenseId, onDataChange, event])
}
