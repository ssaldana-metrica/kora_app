import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { seedDemo } from '@/lib/demo/seed-demo'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function autorizado(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return req.headers.get('authorization') === `Bearer ${secret}`
}

// Puebla la base con el ecosistema demo. Protegido con CRON_SECRET.
// Ejecutar: curl -X POST .../api/admin/seed-demo -H "Authorization: Bearer $CRON_SECRET"
export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  try {
    const supabase = createAdminClient()
    const resultado = await seedDemo(supabase)
    return NextResponse.json(resultado)
  } catch (error) {
    const detalle = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Error en seed-demo:', detalle)
    return NextResponse.json({ error: detalle }, { status: 500 })
  }
}
