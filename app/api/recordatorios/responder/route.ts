import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackEventServer } from '@/lib/services/tracking.service'

// El paciente confirma un recordatorio ("Sí, lo tomé"). Mide la tasa de
// respuesta, métrica clave de la tesis.
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { recordatorioId, respuesta } = await req.json()
  if (!recordatorioId) {
    return NextResponse.json({ error: 'Falta recordatorioId' }, { status: 400 })
  }

  // RLS garantiza que solo el dueño puede actualizar su recordatorio.
  const { error } = await supabase
    .from('recordatorios')
    .update({
      estado: 'respondido',
      respondido_at: new Date().toISOString(),
      respuesta: respuesta ?? 'si',
    })
    .eq('id', recordatorioId)
    .eq('paciente_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await trackEventServer('recordatorio_respondido', {
    userId: user.id,
    metadata: { recordatorioId, respuesta: respuesta ?? 'si' },
  })

  return NextResponse.json({ ok: true })
}
