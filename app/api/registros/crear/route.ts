import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crearRegistro } from '@/lib/services/registro.service'
import { trackEventServer } from '@/lib/services/tracking.service'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const registro = await crearRegistro({ ...body, paciente_id: user.id })
  await trackEventServer('registro_completado', { userId: user.id })

  return NextResponse.json(registro)
}
