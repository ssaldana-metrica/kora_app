import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type { Medicamento } from '@/lib/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface RecetaExtraida {
  medicamentos: Array<{
    nombre: string
    dosis: string
    frecuencia_horas: number
    duracion_dias: number | null
    instrucciones_especiales: string | null
  }>
  medico_nombre?: string | null
  fecha_receta?: string | null
  diagnostico?: string | null
  error?: string
}

export async function procesarRecetaConIA(imageUrl: string): Promise<RecetaExtraida> {
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) throw new Error('No se pudo descargar la imagen')

  const imageBuffer = await imageResponse.arrayBuffer()
  const base64Image = Buffer.from(imageBuffer).toString('base64')
  const contentType = (imageResponse.headers.get('content-type') || 'image/jpeg') as
    | 'image/jpeg'
    | 'image/png'
    | 'image/gif'
    | 'image/webp'

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: contentType, data: base64Image },
          },
          {
            type: 'text',
            text: `Analiza esta imagen. Si es una receta médica, extrae los datos.
Responde SOLO con un JSON válido sin texto adicional:
{
  "es_receta": true/false,
  "medico_nombre": "nombre del médico si aparece o null",
  "fecha_receta": "YYYY-MM-DD si aparece o null",
  "diagnostico": "diagnóstico mencionado o null",
  "medicamentos": [
    {
      "nombre": "nombre del medicamento",
      "dosis": "dosis exacta ej: 500mg",
      "frecuencia_horas": número entero cada cuántas horas,
      "duracion_dias": número entero o null,
      "instrucciones_especiales": "instrucciones adicionales o null"
    }
  ]
}
Si no es una receta médica devuelve: {"es_receta": false, "medicamentos": []}`,
          },
        ],
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
  try {
    const cleaned = responseText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)
    if (!parsed.es_receta) {
      return { medicamentos: [], error: 'no_parece_receta' }
    }
    return {
      medicamentos: parsed.medicamentos ?? [],
      medico_nombre: parsed.medico_nombre ?? null,
      fecha_receta: parsed.fecha_receta ?? null,
      diagnostico: parsed.diagnostico ?? null,
    }
  } catch {
    return { medicamentos: [] }
  }
}

export async function guardarMedicamentos(
  pacienteId: string,
  medicamentos: RecetaExtraida['medicamentos']
): Promise<Medicamento[]> {
  const supabase = await createClient()
  const inserts = medicamentos.map(med => ({
    paciente_id: pacienteId,
    nombre: med.nombre,
    dosis: med.dosis,
    frecuencia_horas: med.frecuencia_horas,
    duracion_dias: med.duracion_dias ?? null,
    instrucciones_especiales: med.instrucciones_especiales ?? null,
    activo: false,
  }))
  const { data, error } = await supabase.from('medicamentos').insert(inserts).select()
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function confirmarMedicamentos(pacienteId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('medicamentos')
    .update({ activo: true })
    .eq('paciente_id', pacienteId)
    .eq('activo', false)
}

export async function getMedicamentosActivos(pacienteId: string): Promise<Medicamento[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('medicamentos')
    .select('*')
    .eq('paciente_id', pacienteId)
    .eq('activo', true)
    .order('created_at', { ascending: false })
  return data ?? []
}
