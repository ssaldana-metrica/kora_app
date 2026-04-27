import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { pacienteNombre, registros, documentos } = await req.json()

    if (!registros || registros.length === 0) {
      return NextResponse.json({
        resumen: 'Este paciente aún no tiene registros en los últimos 30 días.',
      })
    }

    const total = registros.length
    const tomados = registros.filter((r: any) => r.tomo_medicamento).length  // ✅
    const adherencia = Math.round((tomados / total) * 100)

    const conPresion = registros.filter((r: any) => r.presion_sistolica)
    const presionPromS = conPresion.length > 0
      ? Math.round(conPresion.reduce((s: number, r: any) => s + r.presion_sistolica, 0) / conPresion.length)
      : null
    const presionPromD = conPresion.length > 0
      ? Math.round(conPresion.reduce((s: number, r: any) => s + r.presion_diastolica, 0) / conPresion.length)
      : null
    const presionMaxS = conPresion.length > 0
      ? Math.max(...conPresion.map((r: any) => r.presion_sistolica))
      : null

    const diasDolor    = registros.filter((r: any) => r.dolor_cabeza && r.dolor_cabeza >= 3).length
    const diasMareos   = registros.filter((r: any) => r.mareos).length
    const diasHinchazon = registros.filter((r: any) => r.hinchazon).length
    const bienestarProm = registros.reduce((s: number, r: any) => s + r.bienestar_general, 0) / total

    const ultimo = registros[0]
    const diasSinRegistrar = Math.floor(
      (Date.now() - new Date(ultimo.fecha).getTime()) / (1000 * 60 * 60 * 24)
    )

    const notas = registros
      .filter((r: any) => r.notas && r.notas.trim())
      .map((r: any) => `- ${r.fecha}: "${r.notas}"`)
      .join('\n')

    const contexto = `
DATOS DEL PACIENTE: ${pacienteNombre}
Período analizado: últimos 30 días (${total} registros)

ADHERENCIA AL MEDICAMENTO:
- Tomó el medicamento ${tomados} de ${total} días = ${adherencia}%
- Días que NO tomó: ${total - tomados}

PRESIÓN ARTERIAL:
${conPresion.length > 0
  ? `- Promedio: ${presionPromS}/${presionPromD} mmHg
- Presión sistólica máxima registrada: ${presionMaxS} mmHg
- Registros con presión: ${conPresion.length} de ${total} días`
  : '- No se registró presión arterial en este período'}

SÍNTOMAS FRECUENTES:
- Días con dolor de cabeza intenso (≥3/5): ${diasDolor}
- Días con mareos: ${diasMareos}
- Días con hinchazón: ${diasHinchazon}

BIENESTAR GENERAL:
- Promedio: ${bienestarProm.toFixed(1)} / 5
- Último registro: hace ${diasSinRegistrar} día(s)

DOCUMENTOS SUBIDOS: ${documentos.length}
${documentos.map((d: any) => `- ${d.tipo}: ${d.nombre_archivo}`).join('\n') || 'Ninguno'}

NOTAS DEL PACIENTE:
${notas || 'Sin notas'}
`.trim()

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `Eres KORA, asistente clínico de seguimiento entre consultas.
Generas resúmenes pre-consulta concisos para médicos.
Usa estos encabezados exactos con emoji, en este orden:
🟢 Estado general
💊 Adherencia al medicamento
⚠️ Síntomas y alertas
📋 Puntos para la consulta

Sé directo y clínico. Máximo 250 palabras en total.
No hagas diagnósticos. Presenta los datos y tendencias.
Responde siempre en español.`,
      messages: [
        {
          role: 'user',
          content: `Genera el resumen pre-consulta con estos datos:\n\n${contexto}`,
        },
      ],
    })

    const resumen =
      message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ resumen })
  } catch (error) {
    console.error('Error generando resumen:', error)
    return NextResponse.json(
      { error: 'Error al generar el resumen' },
      { status: 500 }
    )
  }
}