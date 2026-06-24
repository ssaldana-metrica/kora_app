import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { trackEvent } from '@/lib/tracking'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Servicio de IA no disponible' }, { status: 503 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { message, history } = await req.json() as {
    message: string
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  }

  // --- Fetch patient context ---

  // Profile
  const { data: profile } = await supabase
    .from('pacientes')
    .select('nombre, medico_id')
    .eq('id', user.id)
    .single()

  const nombre = profile?.nombre ?? 'Paciente'

  // Active medications
  const { data: medicamentos } = await supabase
    .from('medicamentos')
    .select('nombre, dosis, frecuencia_horas')
    .eq('paciente_id', user.id)
    .eq('activo', true)

  // Last 7 registros
  const { data: registros } = await supabase
    .from('registros')
    .select('fecha, bienestar_general, tomo_medicamento, presion_sistolica, presion_diastolica')
    .eq('paciente_id', user.id)
    .order('fecha', { ascending: false })
    .limit(7)

  // Documents list (names only)
  const { data: documentos } = await supabase
    .from('documentos')
    .select('nombre_archivo, tipo')
    .eq('paciente_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // --- Build context strings ---

  const medicamentosStr = medicamentos && medicamentos.length > 0
    ? medicamentos
        .map(m => `• ${m.nombre} — ${m.dosis}, cada ${m.frecuencia_horas}h`)
        .join('\n')
    : 'Sin medicamentos activos registrados'

  const registrosStr = registros && registros.length > 0
    ? registros
        .map(r => {
          const partes = [`Fecha: ${r.fecha}`, `Bienestar: ${r.bienestar_general}/5`, `Medicamento tomado: ${r.tomo_medicamento ? 'SÍ' : 'NO'}`]
          if (r.presion_sistolica) partes.push(`Presión: ${r.presion_sistolica}/${r.presion_diastolica}`)
          return partes.join(' | ')
        })
        .join('\n')
    : 'Sin registros recientes'

  const documentosStr = documentos && documentos.length > 0
    ? documentos.map(d => `• ${d.nombre_archivo} (${d.tipo})`).join('\n')
    : 'Sin documentos subidos'

  // --- System prompt ---

  const isNewConversation = !history || history.length === 0

  const systemPrompt = `Eres KORA, el asistente de salud personal de ${nombre}. Eres amable, claro, y hablas en español simple para adulto mayor.

DATOS DEL PACIENTE:
- Medicamentos activos:
${medicamentosStr}
- Últimos registros:
${registrosStr}
- Documentos:
${documentosStr}

LO QUE PUEDES HACER:
- Explicar la medicación y horarios del paciente
- Explicar términos médicos de sus documentos en lenguaje simple
- Ayudar a preparar preguntas para el médico
- Motivar con mensajes positivos sobre la adherencia
- Ayudar a registrar signos vitales si el paciente te los dicta

PROHIBICIONES ABSOLUTAS (si el usuario pregunta esto, di que no puedes ayudar con eso):
- NO diagnostiques enfermedades
- NO sugieras cambios de dosis ni medicamentos
- NO digas "no te preocupes" ante síntomas que podrían ser serios
- NO inventes información que no está en los datos del paciente

SÍNTOMAS DE ALARMA: Si mencionan dolor de pecho, dificultad para respirar, pérdida de visión, parálisis, o dolor de cabeza muy fuerte y repentino, responde SOLO con:
"Eso requiere atención médica urgente. Llama a emergencias (116 en Perú) o ve a una urgencia ahora."

${isNewConversation ? 'DISCLAIMER: Al final de tu primer mensaje incluye: "_Soy un asistente de apoyo. No reemplazo la consulta con tu médico._"' : ''}`

  // --- Call Claude ---

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...(history ?? []),
    { role: 'user', content: message },
  ]

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages,
    })

    const reply =
      response.content[0].type === 'text' ? response.content[0].text : ''

    // Track usage — fire and forget, silent fail
    await trackEvent('chat_usado', { userId: user.id })

    return NextResponse.json({ reply })
  } catch (error) {
    console.error('Error en chat KORA:', error)
    return NextResponse.json({ error: 'Error al conectar con el asistente' }, { status: 500 })
  }
}
