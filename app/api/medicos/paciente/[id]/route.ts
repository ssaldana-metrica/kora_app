import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPaciente } from '@/lib/services/paciente.service'
import { getHistorial } from '@/lib/services/registro.service'
import { getDocumentos } from '@/lib/services/documento.service'
import { getMedicamentosActivos } from '@/lib/services/receta.service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id: pacienteId } = await params

  const [paciente, registros, documentos, medicamentos] = await Promise.all([
    getPaciente(pacienteId),
    getHistorial(pacienteId, 30),
    getDocumentos(pacienteId),
    getMedicamentosActivos(pacienteId),
  ])

  if (!paciente) return NextResponse.json({ error: 'Paciente no encontrado' }, { status: 404 })

  return NextResponse.json({ paciente, registros, documentos, medicamentos })
}
