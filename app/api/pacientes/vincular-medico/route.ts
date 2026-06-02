import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { vincularPacienteAMedico } from '@/lib/services/vinculacion.service'
import { trackEventServer } from '@/lib/services/tracking.service'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { medicoId } = await req.json()
  if (!medicoId) return NextResponse.json({ error: 'medicoId requerido' }, { status: 400 })

  await vincularPacienteAMedico(user.id, medicoId)
  await trackEventServer('paciente_vinculado', { userId: user.id, medicoId })

  return NextResponse.json({ ok: true })
}
