import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Panel admin: lista global de médicos y pacientes con cómo van.
 * Solo accesible para usuarios con profiles.es_admin = true.
 * Lee la vista agregada `panel_admin` con el cliente service-role.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Gate: el que llama debe ser admin.
  const { data: perfil } = await supabase
    .from('profiles')
    .select('es_admin')
    .eq('id', user.id)
    .single()

  if (!perfil?.es_admin) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: filas, error } = await admin
    .from('panel_admin')
    .select('*')
    .order('medico', { ascending: true })

  if (error) {
    console.error('Error leyendo panel_admin:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ pacientes: filas ?? [] })
}
