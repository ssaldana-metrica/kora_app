import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPacientesDelMedico } from '@/lib/services/paciente.service'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const pacientes = await getPacientesDelMedico(user.id)
  return NextResponse.json(pacientes)
}
