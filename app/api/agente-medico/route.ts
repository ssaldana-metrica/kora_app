import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { pacienteNombre, registros, documentos, historial } = await req.json()

    const total = registros.length
    const tomados = registros.filter((r: any) => r.tomo_medicamento).length  // ✅
    const adherencia = total > 0 ? Math.round((tomados / total) * 100) : 0
    const conPresion = registros.filter((r: any) => r.presion_sistolica)

    const resumenRegistros = registros
      .slice(0, 30)
      .map((r: any) =>
        [
          `Fecha: ${r.fecha}`,
          r.presion_sistolica ? `Presión: ${r.presion_sistolica}/${r.presion_diastolica}` : null,
          `Medicamento: ${r.tomo_medicamento ? 'SÍ' : 'NO'}`,  // ✅
          r.dolor_cabeza ? `Dolor cabeza: ${r.dolor_cabeza}/5` : null,
          r.mareos ? 'Mareos: SÍ' : null,
          r.hinchazon ? 'Hinchazón: SÍ' : null,
          `Bienestar: ${r.bienestar_general}/5`,
          r.notas ? `Nota: "${r.notas}"` : null,
        ]
          .filter(Boolean)
          .join(' | ')
      )
      .join('\n')

    const contexto = `
PACIENTE: ${pacienteNombre}
Período: últimos 30 días | Total registros: ${total}
Adherencia al medicamento: ${adherencia}% (${tomados}/${total} días)
Registros con presión: ${conPresion.length}
Documentos subidos: ${documentos.length}

HISTORIAL DE REGISTROS:
${resumenRegistros || 'Sin registros'}
`.trim()

    const mensajes = historial.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: `Eres KORA, el asistente clínico de seguimiento entre consultas.
Tienes acceso al historial completo de ${pacienteNombre} de los últimos 30 días:

${contexto}

Reglas:
- Responde las preguntas del médico de forma concisa y clínica
- Basa tus respuestas SOLO en los datos reales del historial
- Si el médico pregunta algo que no está en los datos, dilo claramente
- NO hagas diagnósticos ni recomendaciones de tratamiento
- Presenta datos y tendencias objetivamente
- Responde en español
- Máximo 150 palabras por respuesta`,
      messages: mensajes,
    })

    const respuesta =
      message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ respuesta })
  } catch (error) {
    console.error('Error en agente médico:', error)
    return NextResponse.json(
      { error: 'Error al conectar con el agente' },
      { status: 500 }
    )
  }
}