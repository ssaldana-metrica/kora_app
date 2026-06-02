import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { Registro, Documento } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CACHE_HORAS = 4

export async function getResumenCacheado(pacienteId: string, medicoId: string): Promise<string | null> {
  const supabase = await createClient()
  const hace4h = new Date(Date.now() - CACHE_HORAS * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('resumenes')
    .select('contenido')
    .eq('paciente_id', pacienteId)
    .eq('medico_id', medicoId)
    .gte('created_at', hace4h)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.contenido ?? null
}

export async function generarResumen(
  pacienteNombre: string,
  registros: Registro[],
  documentos: Documento[],
  pacienteId: string,
  medicoId: string
): Promise<string> {
  const resumenCacheado = await getResumenCacheado(pacienteId, medicoId)
  if (resumenCacheado) return resumenCacheado

  if (!registros.length) {
    return 'Este paciente aún no tiene registros en los últimos 30 días.'
  }

  const total = registros.length
  const tomados = registros.filter(r => r.tomo_medicamento).length
  const adherencia = Math.round((tomados / total) * 100)
  const conPresion = registros.filter(r => r.presion_sistolica)
  const presionPromS = conPresion.length
    ? Math.round(conPresion.reduce((s, r) => s + (r.presion_sistolica ?? 0), 0) / conPresion.length)
    : null
  const presionPromD = conPresion.length
    ? Math.round(conPresion.reduce((s, r) => s + (r.presion_diastolica ?? 0), 0) / conPresion.length)
    : null
  const presionMaxS = conPresion.length
    ? Math.max(...conPresion.map(r => r.presion_sistolica ?? 0))
    : null

  const diasDolor = registros.filter(r => r.dolor_cabeza && r.dolor_cabeza >= 3).length
  const diasMareos = registros.filter(r => r.mareos).length
  const diasHinchazon = registros.filter(r => r.hinchazon).length
  const bienestarProm = registros.reduce((s, r) => s + r.bienestar_general, 0) / total
  const diasSinRegistrar = Math.floor(
    (Date.now() - new Date(registros[0].fecha).getTime()) / (1000 * 60 * 60 * 24)
  )
  const notas = registros
    .filter(r => r.notas?.trim())
    .map(r => `- ${r.fecha}: "${r.notas}"`)
    .join('\n')

  const contexto = `DATOS DEL PACIENTE: ${pacienteNombre}
Período analizado: últimos 30 días (${total} registros)

ADHERENCIA AL MEDICAMENTO:
- Tomó el medicamento ${tomados} de ${total} días = ${adherencia}%

PRESIÓN ARTERIAL:
${conPresion.length
  ? `- Promedio: ${presionPromS}/${presionPromD} mmHg\n- Sistólica máx: ${presionMaxS} mmHg`
  : '- No registrada'}

SÍNTOMAS:
- Días con dolor de cabeza intenso (≥3/5): ${diasDolor}
- Días con mareos: ${diasMareos}
- Días con hinchazón: ${diasHinchazon}

BIENESTAR: ${bienestarProm.toFixed(1)}/5 (promedio)
Último registro: hace ${diasSinRegistrar} día(s)

DOCUMENTOS: ${documentos.length}
NOTAS: ${notas || 'Sin notas'}`

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
    messages: [{ role: 'user', content: `Genera el resumen pre-consulta:\n\n${contexto}` }],
  })

  const resumen = message.content[0].type === 'text' ? message.content[0].text : ''

  const supabase = await createClient()
  await supabase.from('resumenes').insert({
    paciente_id: pacienteId,
    medico_id: medicoId,
    contenido: resumen,
  })

  return resumen
}
