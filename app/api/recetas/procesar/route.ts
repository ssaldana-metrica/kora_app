import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { procesarRecetaConIA, guardarMedicamentos } from '@/lib/services/receta.service'
import { marcarDocumentoProcesado } from '@/lib/services/documento.service'
import { trackEventServer } from '@/lib/services/tracking.service'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { documentoId, imageUrl } = await req.json()

    const receta = await procesarRecetaConIA(imageUrl)

    if (receta.error === 'no_parece_receta') {
      return NextResponse.json({ medicamentos: [], error: 'no_parece_receta' })
    }

    if (!receta.medicamentos.length) {
      return NextResponse.json({ medicamentos: [] })
    }

    const medicamentos = await guardarMedicamentos(user.id, receta.medicamentos)

    if (documentoId) {
      await marcarDocumentoProcesado(documentoId, {
        medico_nombre: receta.medico_nombre,
        fecha_receta: receta.fecha_receta,
        diagnostico: receta.diagnostico,
      })
    }

    await trackEventServer('receta_procesada', { userId: user.id })

    return NextResponse.json({ medicamentos, receta })
  } catch (error) {
    console.error('Error procesando receta:', error)
    return NextResponse.json({ error: 'Error al procesar la receta' }, { status: 500 })
  }
}
