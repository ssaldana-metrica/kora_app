import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHistorial } from '@/lib/services/registro.service'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const dias = Number(req.nextUrl.searchParams.get('dias') ?? 30)
  const registros = await getHistorial(user.id, dias)
  return NextResponse.json(registros)
}
