import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { documentoId, imageUrl, userId } = await req.json()

    // Download image and convert to base64
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'No se pudo descargar la imagen' }, { status: 400 })
    }
    const imageBuffer = await imageResponse.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'

    // Call Claude to extract prescription data
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: contentType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Analiza esta receta médica y extrae los medicamentos. 
Responde SOLO con un JSON válido, sin texto adicional, con este formato exacto:
{
  "medicamentos": [
    {
      "nombre": "nombre del medicamento",
      "dosis": "dosis exacta (ej: 500mg)",
      "frecuencia_horas": número entero (cada cuántas horas),
      "duracion_dias": número entero o null si no se especifica,
      "instrucciones_especiales": "instrucciones adicionales o null"
    }
  ]
}

Si no puedes leer la receta claramente, devuelve: {"medicamentos": []}`,
            },
          ],
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    let medicamentosData: {
      nombre: string
      dosis: string
      frecuencia_horas: number
      duracion_dias: number | null
      instrucciones_especiales: string | null
    }[] = []

    try {
      const cleaned = responseText.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      medicamentosData = parsed.medicamentos ?? []
    } catch {
      return NextResponse.json({ medicamentos: [] })
    }

    if (medicamentosData.length === 0) {
      return NextResponse.json({ medicamentos: [] })
    }

    // Insert medications into Supabase (inactive until confirmed)
    const supabase = await createClient()
    const inserts = medicamentosData.map((med) => ({
      paciente_id: userId,
      nombre: med.nombre,
      dosis: med.dosis,
      frecuencia_horas: med.frecuencia_horas,
      duracion_dias: med.duracion_dias ?? null,
      instrucciones_especiales: med.instrucciones_especiales ?? null,
      activo: false, // patient must confirm before activating
    }))

    const { data: medicamentosInsertados, error } = await supabase
      .from('medicamentos')
      .insert(inserts)
      .select()

    if (error) {
      console.error('Error insertando medicamentos:', error)
      return NextResponse.json({ error: 'Error guardando medicamentos' }, { status: 500 })
    }

    // Mark document as processed
    await supabase
      .from('documentos')
      .update({ procesado_ia: true })
      .eq('id', documentoId)

    return NextResponse.json({ medicamentos: medicamentosInsertados })
  } catch (error) {
    console.error('Error procesando receta:', error)
    return NextResponse.json(
      { error: 'Error al procesar la receta' },
      { status: 500 }
    )
  }
}