import { createClient } from '@/lib/supabase/client'

type EventoTipo =
  | 'medico_crea_cuenta'
  | 'paciente_vinculado'
  | 'registro_completado'
  | 'resumen_generado'
  | 'pdf_exportado'
  | 'paciente_crea_cuenta'

interface TrackOptions {
  userId?: string
  medicoId?: string
  metadata?: Record<string, unknown>
}

/**
 * Registra un evento de uso en Supabase.
 * No lanza errores — falla silenciosamente para no interrumpir el flujo.
 */
export async function trackEvent(tipo: EventoTipo, options: TrackOptions = {}) {
  try {
    const supabase = createClient()
    await supabase.from('eventos_tracking').insert({
      tipo,
      user_id: options.userId ?? null,
      medico_id: options.medicoId ?? null,
      metadata: options.metadata ?? null,
    })
  } catch {
    // Silent fail — tracking never blocks the user
  }
}