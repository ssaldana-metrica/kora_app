import { createClient } from '@/lib/supabase/server'
import type { Documento } from '@/lib/types'

export async function getDocumentos(pacienteId: string): Promise<Documento[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('documentos')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function marcarDocumentoProcesado(
  documentoId: string,
  metadata?: { medico_nombre?: string | null; fecha_receta?: string | null; diagnostico?: string | null }
): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('documentos')
    .update({ procesado_ia: true, ...metadata })
    .eq('id', documentoId)
}
