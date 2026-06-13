import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { calcularAdherencia, calcularRacha } from '@/lib/progreso'

// Resumen amable de la propia evolución del paciente (Épica 3.2).
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: registros } = await supabase
    .from('registros')
    .select('fecha, tomo_medicamento, presion_sistolica, presion_diastolica, bienestar_general')
    .eq('paciente_id', user.id)
    .gte('fecha', hace30)
    .order('fecha', { ascending: false })

  const regs = registros ?? []
  const racha = calcularRacha(regs)
  const adherencia = calcularAdherencia(regs)

  if (regs.length < 3) {
    return NextResponse.json({
      racha,
      adherencia,
      mensaje:
        'Aún no tienes suficientes registros para ver tu evolución. Registra unos días más y aquí verás cómo vas. ¡Tú puedes! 💙',
    })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // Sin IA configurada: mensaje útil basado en datos, sin fallar.
    return NextResponse.json({
      racha,
      adherencia,
      mensaje: `Llevas ${regs.length} registros este mes y una adherencia del ${adherencia}%. ¡Sigue así!`,
    })
  }

  try {
    const conPresion = regs.filter(r => r.presion_sistolica)
    const promS = conPresion.length
      ? Math.round(conPresion.reduce((s, r) => s + (r.presion_sistolica ?? 0), 0) / conPresion.length)
      : null
    const contexto = `Registros últimos 30 días: ${regs.length}
Adherencia al medicamento: ${adherencia}%
Racha actual: ${racha} días seguidos
Presión sistólica promedio: ${promS ?? 'sin datos'}`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: `Eres KORA, acompañas a un paciente (posiblemente adulto mayor) en su salud.
Escribe 2-3 frases cálidas, simples y motivadoras sobre su evolución, en español.
Usa lenguaje cotidiano (nada clínico ni técnico). No des diagnósticos ni cambies tratamiento.
Reconoce su esfuerzo y anima a seguir registrando.`,
      messages: [{ role: 'user', content: `Datos del paciente:\n${contexto}\n\nEscríbele un mensaje breve de ánimo.` }],
    })
    const mensaje = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ racha, adherencia, mensaje })
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error'
    console.error('Error mi-progreso:', detalle)
    return NextResponse.json({
      racha,
      adherencia,
      mensaje: `Llevas ${regs.length} registros este mes y una adherencia del ${adherencia}%. ¡Sigue así!`,
    })
  }
}
