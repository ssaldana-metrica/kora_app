import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Panel admin: lista global de médicos y pacientes con cómo van.
 * Usa la función SECURITY DEFINER `get_panel_admin`, que verifica
 * internamente que el que llama tenga profiles.es_admin = true y
 * devuelve la vista agregada saltando RLS. No requiere service-role key.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Gate explícito para un 403 claro (la función también lo refuerza).
  const { data: perfil } = await supabase
    .from('profiles')
    .select('es_admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.es_admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { data: filas, error } = await supabase.rpc('get_panel_admin')

  if (error) {
    console.error('Error en get_panel_admin:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pacientes: filas ?? [] })
}
