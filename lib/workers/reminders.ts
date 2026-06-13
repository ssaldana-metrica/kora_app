// Motor de recordatorios de KORA (Épica 2).
//
// Responsabilidad: decidir QUÉ recordatorios hacen falta en este momento y
// despacharlos por el canal activo, de forma IDEMPOTENTE (cada recordatorio
// lógico se envía una sola vez gracias a `dedupe_key`).
//
// Se invoca desde un Vercel Cron Job (`/api/cron/recordatorios`) cada hora.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getCanalAdapter, type ChannelAdapter } from './channels'

interface Candidato {
  paciente_id: string
  medicamento_id: string | null
  tipo: 'medicamento' | 'registro_diario' | 'refill' | 'alerta_cuidador'
  mensaje: string
  programado_para: string
  dedupe_key: string
}

const DIA_MS = 24 * 60 * 60 * 1000
const HORA_PRIMERA_DOSIS = 8 // las dosis del día se reparten a partir de las 08:00

function ymd(d: Date): string {
  return d.toISOString().split('T')[0]
}

/**
 * Construye la lista de recordatorios que deberían existir "ahora".
 * No escribe nada: solo calcula candidatos con su clave de idempotencia.
 */
export async function construirCandidatos(
  supabase: SupabaseClient,
  ahora: Date = new Date()
): Promise<Candidato[]> {
  const candidatos: Candidato[] = []
  const hoy = ymd(ahora)

  // ── 1. Recordatorio de toma de medicamento ──────────────────────────────
  const { data: meds } = await supabase
    .from('medicamentos')
    .select('id, paciente_id, nombre, dosis, frecuencia_horas, duracion_dias, fecha_inicio, recordatorio_activo, activo')
    .eq('activo', true)
    .eq('recordatorio_activo', true)

  for (const med of meds ?? []) {
    const freq = Math.max(1, med.frecuencia_horas ?? 24)
    // Horas de dosis del día: 08:00, 08:00+freq, ... dentro del día
    for (let h = HORA_PRIMERA_DOSIS; h < 24; h += freq) {
      const slot = new Date(ahora)
      slot.setHours(h, 0, 0, 0)
      const minutosDesde = (ahora.getTime() - slot.getTime()) / 60000
      // La dosis está "vencida" si su hora ya pasó hace 0–90 min (ventana del cron horario)
      if (minutosDesde >= 0 && minutosDesde < 90) {
        const hh = String(h).padStart(2, '0')
        candidatos.push({
          paciente_id: med.paciente_id,
          medicamento_id: med.id,
          tipo: 'medicamento',
          mensaje: `¿Tomaste tu ${med.nombre}${med.dosis ? ` (${med.dosis})` : ''} de las ${hh}:00? Responde SÍ.`,
          programado_para: slot.toISOString(),
          dedupe_key: `med:${med.id}:${hoy}:${hh}`,
        })
      }
    }

    // ── 3. Recompra (refill) ───────────────────────────────────────────────
    if (med.fecha_inicio && med.duracion_dias) {
      const fin = new Date(med.fecha_inicio)
      fin.setDate(fin.getDate() + med.duracion_dias)
      const diasRestantes = Math.ceil((fin.getTime() - ahora.getTime()) / DIA_MS)
      if (diasRestantes >= 0 && diasRestantes <= 3) {
        candidatos.push({
          paciente_id: med.paciente_id,
          medicamento_id: med.id,
          tipo: 'refill',
          mensaje:
            diasRestantes === 0
              ? `Hoy se te acaba tu ${med.nombre}. Recuerda volver a comprarlo.`
              : `Tu ${med.nombre} se acaba en ${diasRestantes} día(s). Conviene recomprarlo pronto.`,
          programado_para: ahora.toISOString(),
          dedupe_key: `refill:${med.id}:${ymd(fin)}`,
        })
      }
    }
  }

  // ── 2. Recordatorio de registro diario ──────────────────────────────────
  const { data: pacientes } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'paciente')

  for (const p of pacientes ?? []) {
    const { data: ultimo } = await supabase
      .from('registros')
      .select('created_at')
      .eq('paciente_id', p.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const sinRegistro24h =
      !ultimo || ahora.getTime() - new Date(ultimo.created_at).getTime() >= DIA_MS

    if (sinRegistro24h) {
      candidatos.push({
        paciente_id: p.id,
        medicamento_id: null,
        tipo: 'registro_diario',
        mensaje: 'No olvides registrar cómo te sientes hoy. Tu médico lo agradecerá 💙',
        programado_para: ahora.toISOString(),
        dedupe_key: `reg:${p.id}:${hoy}`,
      })
    }
  }

  // TODO(alerta_cuidador): requiere un campo de cuidador/contacto en `profiles`
  // (cuidador_email o cuidador_telefono). Cuando exista, avisar al cuidador si
  // el paciente lleva 48h sin registrar o tiene una lectura de riesgo.

  return candidatos
}

export interface ResultadoCron {
  candidatos: number
  nuevos: number
  enviados: number
  fallidos: number
}

/**
 * Pipeline completo: calcula candidatos, los encola de forma idempotente y
 * despacha los pendientes por el canal activo. Devuelve métricas del corrido.
 */
export async function procesarRecordatorios(
  supabase: SupabaseClient,
  adapter: ChannelAdapter = getCanalAdapter(),
  ahora: Date = new Date()
): Promise<ResultadoCron> {
  const candidatos = await construirCandidatos(supabase, ahora)

  let nuevos = 0
  if (candidatos.length) {
    // Insert idempotente: si ya existe la dedupe_key, se ignora.
    const filas = candidatos.map(c => ({ ...c, canal: adapter.nombre.includes('whatsapp') ? 'whatsapp' : 'push', estado: 'pendiente' }))
    const { data, error } = await supabase
      .from('recordatorios')
      .upsert(filas, { onConflict: 'dedupe_key', ignoreDuplicates: true })
      .select('id')
    if (error) console.error('Error encolando recordatorios:', error.message)
    nuevos = data?.length ?? 0
  }

  // Despachar los pendientes (incluye los recién creados y cualquier rezagado)
  const { data: pendientes } = await supabase
    .from('recordatorios')
    .select('id, paciente_id, tipo, mensaje')
    .eq('estado', 'pendiente')
    .limit(200)

  let enviados = 0
  let fallidos = 0

  for (const r of pendientes ?? []) {
    try {
      const res = await adapter.enviar({
        paciente_id: r.paciente_id,
        tipo: r.tipo,
        mensaje: r.mensaje,
      })
      await supabase
        .from('recordatorios')
        .update({
          estado: res.ok ? 'enviado' : 'fallido',
          canal: res.canal,
          enviado_at: new Date().toISOString(),
        })
        .eq('id', r.id)

      if (res.ok) {
        enviados++
        await supabase.from('eventos_tracking').insert({
          tipo: 'recordatorio_enviado',
          user_id: r.paciente_id,
          metadata: { recordatorio_id: r.id, tipo: r.tipo, canal: res.canal },
        })
      } else {
        fallidos++
      }
    } catch (e) {
      fallidos++
      console.error('Fallo despachando recordatorio:', e instanceof Error ? e.message : e)
      await supabase.from('recordatorios').update({ estado: 'fallido' }).eq('id', r.id)
    }
  }

  return { candidatos: candidatos.length, nuevos, enviados, fallidos }
}
