import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generarResumen } from '@/lib/services/resumen.service'
import { trackEventServer } from '@/lib/services/tracking.service'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { pacienteNombre, registros, documentos, pacienteId } = await req.json()

    const resumen = await generarResumen(
      pacienteNombre,
      registros,
      documentos,
      pacienteId,
      user.id
    )

    await trackEventServer('resumen_generado', { userId: user.id, medicoId: user.id })

    return NextResponse.json({ resumen })
  } catch (error) {
    console.error('Error generando resumen:', error)
    return NextResponse.json({ error: 'Error al generar el resumen' }, { status: 500 })
  }
}
