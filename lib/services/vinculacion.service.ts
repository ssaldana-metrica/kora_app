import { createClient } from '@/lib/supabase/server'

export async function buscarMedicosPorNombre(query: string): Promise<Array<{
  id: string
  nombre: string
  especialidad: string | null
  ubicacion: string | null
}>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, nombre, especialidad, ubicacion')
    .eq('role', 'medico')
    .ilike('nombre', `%${query}%`)
    .limit(10)
  return data ?? []
}

export async function vincularPacienteAMedico(pacienteId: string, medicoId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ medico_id: medicoId })
    .eq('id', pacienteId)
  if (error) throw new Error(error.message)
}

export async function vincularMedicoAPaciente(medicoId: string, pacienteId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ medico_id: medicoId })
    .eq('id', pacienteId)
  if (error) throw new Error(error.message)
}
