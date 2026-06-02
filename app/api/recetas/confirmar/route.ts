import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { confirmarMedicamentos } from '@/lib/services/receta.service'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  await confirmarMedicamentos(user.id)
  return NextResponse.json({ ok: true })
}
