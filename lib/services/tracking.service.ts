import { createClient } from '@/lib/supabase/server'

type EventoTipo =
  | 'medico_crea_cuenta'
  | 'paciente_crea_cuenta'
  | 'paciente_vinculado'
  | 'registro_completado'
  | 'resumen_generado'
  | 'pdf_exportado'
  | 'receta_procesada'
  | 'recordatorio_enviado'
  | 'recordatorio_respondido'

export async function trackEventServer(
  tipo: EventoTipo,
  options: { userId?: string; medicoId?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const supabase = await createClient()
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
