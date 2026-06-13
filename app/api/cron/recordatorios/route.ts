import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { procesarRecordatorios } from '@/lib/workers/reminders'

// Ejecutado por Vercel Cron (ver vercel.json). Protegido con CRON_SECRET.
export const dynamic = 'force-dynamic'

function autorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}

export async function GET(req: NextRequest) {
  if (!autorizado(req)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()
    const resultado = await procesarRecordatorios(supabase)
    return NextResponse.json({ ok: true, ...resultado })
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error en cron de recordatorios:', detalle)
    return NextResponse.json({ error: detalle }, { status: 500 })
  }
}
