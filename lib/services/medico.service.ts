import { createClient } from '@/lib/supabase/server'
import type { Medico } from '@/lib/types'

export async function getMedico(medicoId: string): Promise<Medico | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, nombre, especialidad, ubicacion, bio, codigo_medico')
    .eq('id', medicoId)
    .single()
  return data ?? null
}

export async function vincularPaciente(medicoId: string, pacienteId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({ medico_id: medicoId })
    .eq('id', pacienteId)
}
