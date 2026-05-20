import { createClient } from '@/lib/supabase/server'
import type { Registro } from '@/lib/types'

export async function crearRegistro(data: Omit<Registro, 'id' | 'created_at'>): Promise<Registro> {
  const supabase = await createClient()
  const { data: result, error } = await supabase
    .from('registros')
    .insert(data)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return result
}

export async function getHistorial(pacienteId: string, dias = 30): Promise<Registro[]> {
  const supabase = await createClient()
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data } = await supabase
    .from('registros')
    .select('*')
    .eq('paciente_id', pacienteId)
    .gte('fecha', desde)
    .order('fecha', { ascending: false })
  return data ?? []
}

export async function getRegistroHoy(pacienteId: string): Promise<Registro | null> {
  const supabase = await createClient()
  const hoy = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('registros')
    .select('*')
    .eq('paciente_id', pacienteId)
    .eq('fecha', hoy)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ?? null
}

export function calcularAdherencia(registros: Registro[]): number {
  if (!registros.length) return 0
  const tomados = registros.filter(r => r.tomo_medicamento).length
  return Math.round((tomados / registros.length) * 100)
}
