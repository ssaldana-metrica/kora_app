// Generador de datos de demostración — KORA V3 (Épica 5).
//
// Crea DOS médicos demo con pacientes realistas que representan distintos
// niveles de adherencia (verde/amarillo/rojo), nombres peruanos, registros
// diarios coherentes y síntomas correlacionados con la presión.
//
// Todo el contenido se marca con es_demo = true para poder separarlo y borrarlo.
// Requiere service-role: ejecutar solo desde servidor (ver /api/admin/seed-demo).

import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Constantes de identidad demo ──────────────────────────────────────────────

const HOY = new Date('2026-06-24')

const MEDICO_1 = {
  email: 'anthony.molleda@demo.kora.app',
  password: 'MolledaKora2026!',
  nombre: 'Dr. Anthony Molleda',
  especialidad: 'Cardiología',
  ubicacion: 'Lima',
  codigo_medico: 'AM7K3P',
}

const MEDICO_2 = {
  email: 'lucia.espinoza@demo.kora.app',
  password: 'EspinozaKora2026!',
  nombre: 'Dra. Lucía Espinoza',
  especialidad: 'Medicina Interna',
  ubicacion: 'Lima',
  codigo_medico: 'LE4M9Q',
}

const DEMO_EMAILS = [MEDICO_1.email, MEDICO_2.email]

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface OpcionesRegistro {
  /** Fracción de días (0–1) en que el paciente tomó el medicamento */
  adherenciaRate: number
  /** [sistólica, diastólica] cuando SÍ tomó el medicamento */
  bpLow: [number, number]
  /** [sistólica, diastólica] cuando NO tomó el medicamento */
  bpHigh: [number, number]
  /**
   * Días atrás en que se emitió el ÚLTIMO registro.
   * 0 = hoy (por defecto). 8 = dejó de registrar hace 8 días.
   */
  lastRegistro?: number
}

interface RegistroInsert {
  paciente_id: string
  user_id: string
  fecha: string
  presion_sistolica: number
  presion_diastolica: number
  pulso: number
  dolor_cabeza: number
  mareos: boolean
  hinchazon: boolean
  tomo_medicamento: boolean
  bienestar_general: number
  notas: string | null
  es_demo: boolean
}

// ── Utilidades ────────────────────────────────────────────────────────────────

/** Entero aleatorio en [min, max] */
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Booleano aleatorio según probabilidad p (0–1) */
function prob(p: number): boolean {
  return Math.random() < p
}

/** Fecha como string YYYY-MM-DD */
function ymd(d: Date): string {
  return d.toISOString().split('T')[0]
}

/** Devuelve la fecha que resulta de restar `days` días a HOY */
function daysAgo(days: number): Date {
  const d = new Date(HOY)
  d.setDate(d.getDate() - days)
  return d
}

// ── Generador de registros ────────────────────────────────────────────────────

/**
 * Genera registros diarios para un paciente.
 *
 * @param pacienteId  UUID del paciente
 * @param dayCount    Total de días hacia atrás desde los que empieza el historial
 * @param opts        Parámetros de control de adherencia y presión
 */
function generarRegistros(
  pacienteId: string,
  dayCount: number,
  opts: OpcionesRegistro,
): RegistroInsert[] {
  const { adherenciaRate, bpLow, bpHigh, lastRegistro = 0 } = opts
  const registros: RegistroInsert[] = []

  // Generamos desde (hoy - dayCount) hasta (hoy - lastRegistro), inclusive
  for (let i = dayCount; i >= lastRegistro; i--) {
    const fecha = daysAgo(i)
    const tomo = prob(adherenciaRate)

    const [baseSys, baseDia] = tomo ? bpLow : bpHigh
    const sys = baseSys + randInt(-4, 4)
    const dia = baseDia + randInt(-4, 4)
    const pulso = randInt(62, 84)
    const presionAlta = sys >= 140

    // Síntomas correlacionados con la presión y con si tomó el medicamento
    const dolor_cabeza = presionAlta
      ? randInt(2, 4)
      : tomo
        ? randInt(0, 1)
        : randInt(0, 2)
    const mareos = presionAlta ? prob(0.55) : prob(0.05)
    const hinchazon = presionAlta ? prob(0.4) : prob(0.05)

    const bienestar_general = Math.max(
      1,
      Math.min(
        5,
        presionAlta
          ? randInt(1, 2)
          : tomo
            ? randInt(3, 5)
            : randInt(2, 4),
      ),
    )

    let notas: string | null = null
    if (!tomo && prob(0.3)) {
      notas = 'Olvidé tomar la pastilla'
    } else if (presionAlta && prob(0.25)) {
      notas = 'Me sentí algo mareado y con dolor de cabeza'
    }

    registros.push({
      paciente_id: pacienteId,
      user_id: pacienteId,
      fecha: ymd(fecha),
      presion_sistolica: sys,
      presion_diastolica: dia,
      pulso,
      dolor_cabeza,
      mareos,
      hinchazon,
      tomo_medicamento: tomo,
      bienestar_general,
      notas,
      es_demo: true,
    })
  }

  return registros
}

/** Inserta registros en lotes de 100 para no exceder límites de la API */
async function insertarRegistros(
  supabase: SupabaseClient,
  registros: RegistroInsert[],
): Promise<void> {
  for (let i = 0; i < registros.length; i += 100) {
    const { error } = await supabase.from('registros').insert(registros.slice(i, i + 100))
    if (error) throw new Error(`Error insertando registros: ${error.message}`)
  }
}

// ── Función principal de seed ─────────────────────────────────────────────────

/**
 * Puebla la base de datos con el ecosistema demo de KORA V3.
 *
 * Idempotente: llama a limpiarDemo antes de crear los datos.
 *
 * El parámetro `_supabase` es aceptado por compatibilidad con la ruta
 * /api/admin/seed-demo pero no se usa: la función crea su propio cliente
 * admin para garantizar permisos de service-role.
 */
export async function seedDemo(
  _supabase?: SupabaseClient,
): Promise<{ ok: boolean; message: string }> {
  const sb = createAdminClient()

  // 1. Empezamos limpio
  await limpiarDemo()

  // ── MÉDICO 1: Dr. Anthony Molleda (Cardiología) ──────────────────────────

  const { data: m1Create, error: m1Err } = await sb.auth.admin.createUser({
    email: MEDICO_1.email,
    password: MEDICO_1.password,
    email_confirm: true,
    user_metadata: {
      nombre: MEDICO_1.nombre,
      role: 'medico',
      especialidad: MEDICO_1.especialidad,
      ubicacion: MEDICO_1.ubicacion,
    },
  })
  if (m1Err || !m1Create.user) {
    throw new Error(`No se pudo crear el médico demo 1: ${m1Err?.message}`)
  }
  const medico1Id = m1Create.user.id

  await sb.from('profiles').update({
    nombre: MEDICO_1.nombre,
    especialidad: MEDICO_1.especialidad,
    ubicacion: MEDICO_1.ubicacion,
    codigo_medico: MEDICO_1.codigo_medico,
    es_demo: true,
  }).eq('id', medico1Id)

  // ── MÉDICO 2: Dra. Lucía Espinoza (Medicina Interna) ─────────────────────

  const { data: m2Create, error: m2Err } = await sb.auth.admin.createUser({
    email: MEDICO_2.email,
    password: MEDICO_2.password,
    email_confirm: true,
    user_metadata: {
      nombre: MEDICO_2.nombre,
      role: 'medico',
      especialidad: MEDICO_2.especialidad,
      ubicacion: MEDICO_2.ubicacion,
    },
  })
  if (m2Err || !m2Create.user) {
    throw new Error(`No se pudo crear el médico demo 2: ${m2Err?.message}`)
  }
  const medico2Id = m2Create.user.id

  await sb.from('profiles').update({
    nombre: MEDICO_2.nombre,
    especialidad: MEDICO_2.especialidad,
    ubicacion: MEDICO_2.ubicacion,
    codigo_medico: MEDICO_2.codigo_medico,
    es_demo: true,
  }).eq('id', medico2Id)

  // ── PACIENTE A — María Elena Castillo (VERDE, alta adherencia) ────────────
  // Médico: Molleda | BP bien controlada | 45 días de registros diarios

  const { data: pACreate, error: pAErr } = await sb.auth.admin.createUser({
    email: 'maria.castillo@demo.kora.app',
    password: MEDICO_1.password,
    email_confirm: true,
    user_metadata: { nombre: 'María Elena Castillo', role: 'paciente' },
  })
  if (pAErr || !pACreate.user) {
    throw new Error(`No se pudo crear Paciente A: ${pAErr?.message}`)
  }
  const pacienteAId = pACreate.user.id

  await sb.from('profiles').update({
    nombre: 'María Elena Castillo',
    medico_id: medico1Id,
    enfermedad: 'Hipertensión',
    fecha_nacimiento: '1960-03-14',
    es_demo: true,
  }).eq('id', pacienteAId)

  await sb.from('medicamentos').insert({
    paciente_id: pacienteAId,
    nombre: 'Losartán',
    dosis: '50mg',
    frecuencia_horas: 24,
    duracion_dias: 90,
    fecha_inicio: ymd(daysAgo(45)),
    activo: true,
    recordatorio_activo: true,
    es_demo: true,
  })

  // Registros: 45 días, adherencia casi perfecta, BP bien controlada
  const registrosA = generarRegistros(pacienteAId, 45, {
    adherenciaRate: 0.97,
    bpLow: [122, 77],
    bpHigh: [132, 84],
    lastRegistro: 0,
  })
  // Ajuste fino: pulso y síntomas coherentes con paciente VERDE
  // (ya manejados en generarRegistros; simplemente aseguramos que los valores
  //  de dolor de cabeza sean casi siempre 0)
  const registrosAFinal = registrosA.map(r => ({
    ...r,
    dolor_cabeza: r.presion_sistolica >= 130 ? Math.min(r.dolor_cabeza, 1) : 0,
    bienestar_general: Math.max(r.bienestar_general, 4),
    mareos: false,
    hinchazon: false,
    pulso: randInt(68, 74),
  }))
  await insertarRegistros(sb, registrosAFinal)

  // ── PACIENTE B — Carlos Romero Vidal (AMARILLO, adherencia media) ─────────
  // Médico: Molleda | BP variable | ~65% cumplimiento | 7 días sin registro

  const { data: pBCreate, error: pBErr } = await sb.auth.admin.createUser({
    email: 'carlos.romero@demo.kora.app',
    password: MEDICO_1.password,
    email_confirm: true,
    user_metadata: { nombre: 'Carlos Romero Vidal', role: 'paciente' },
  })
  if (pBErr || !pBCreate.user) {
    throw new Error(`No se pudo crear Paciente B: ${pBErr?.message}`)
  }
  const pacienteBId = pBCreate.user.id

  await sb.from('profiles').update({
    nombre: 'Carlos Romero Vidal',
    medico_id: medico1Id,
    enfermedad: 'Hipertensión',
    fecha_nacimiento: '1958-07-22',
    es_demo: true,
  }).eq('id', pacienteBId)

  await sb.from('medicamentos').insert({
    paciente_id: pacienteBId,
    nombre: 'Amlodipino',
    dosis: '5mg',
    frecuencia_horas: 24,
    duracion_dias: 60,
    fecha_inicio: ymd(daysAgo(40)),
    activo: true,
    recordatorio_activo: true,
    es_demo: true,
  })

  // 40 días con 7 días sin registro (scatter: omitimos 7 fechas individuales)
  const registrosBRaw = generarRegistros(pacienteBId, 40, {
    adherenciaRate: 0.65,
    bpLow: [131, 85],
    bpHigh: [143, 93],
    lastRegistro: 0,
  })
  // Eliminamos 7 entradas aleatorias para simular días sin registro
  const omitir = new Set<number>()
  while (omitir.size < 7 && omitir.size < registrosBRaw.length) {
    omitir.add(Math.floor(Math.random() * registrosBRaw.length))
  }
  const registrosB = registrosBRaw.filter((_, idx) => !omitir.has(idx))
  await insertarRegistros(sb, registrosB)

  // ── PACIENTE C — Pedro Luis Huamán (ROJO, baja adherencia / riesgo) ───────
  // Médico: Molleda | BP peligrosa | dejó de registrar hace 8 días

  const { data: pCCreate, error: pCErr } = await sb.auth.admin.createUser({
    email: 'pedro.huaman@demo.kora.app',
    password: MEDICO_1.password,
    email_confirm: true,
    user_metadata: { nombre: 'Pedro Luis Huamán', role: 'paciente' },
  })
  if (pCErr || !pCCreate.user) {
    throw new Error(`No se pudo crear Paciente C: ${pCErr?.message}`)
  }
  const pacienteCId = pCCreate.user.id

  await sb.from('profiles').update({
    nombre: 'Pedro Luis Huamán',
    medico_id: medico1Id,
    enfermedad: 'Hipertensión severa',
    fecha_nacimiento: '1952-11-05',
    es_demo: true,
  }).eq('id', pacienteCId)

  await sb.from('medicamentos').insert({
    paciente_id: pacienteCId,
    nombre: 'Enalapril',
    dosis: '10mg',
    frecuencia_horas: 12,
    duracion_dias: 30,
    fecha_inicio: ymd(daysAgo(30)),
    activo: true,
    recordatorio_activo: false,
    es_demo: true,
  })

  // Registros hasta hace 8 días; BP peligrosa; casi sin medicamento
  const registrosCRaw = generarRegistros(pacienteCId, 30, {
    adherenciaRate: 0.18,
    bpLow: [155, 100],
    bpHigh: [165, 108],
    lastRegistro: 8, // último registro fue hace 8 días (16 Jun 2026)
  })
  // Aseguramos síntomas severos coherentes con ROJO
  const registrosC = registrosCRaw.map(r => ({
    ...r,
    dolor_cabeza: randInt(3, 4),
    mareos: true,
    hinchazon: prob(0.7),
    bienestar_general: randInt(1, 2),
    notas: r.notas ?? (prob(0.4) ? 'Me duele mucho la cabeza, tengo mareos' : null),
  }))
  await insertarRegistros(sb, registrosC)

  // ── PACIENTE D — Roberto Huanca Flores (VERDE/AMARILLO, diabético) ────────
  // Médico: Espinoza | BP mayormente normal, picos ocasionales | 35 días

  const { data: pDCreate, error: pDErr } = await sb.auth.admin.createUser({
    email: 'roberto.huanca@demo.kora.app',
    password: MEDICO_2.password,
    email_confirm: true,
    user_metadata: { nombre: 'Roberto Huanca Flores', role: 'paciente' },
  })
  if (pDErr || !pDCreate.user) {
    throw new Error(`No se pudo crear Paciente D: ${pDErr?.message}`)
  }
  const pacienteDId = pDCreate.user.id

  await sb.from('profiles').update({
    nombre: 'Roberto Huanca Flores',
    medico_id: medico2Id,
    enfermedad: 'Hipertensión y Diabetes tipo 2',
    fecha_nacimiento: '1955-09-30',
    es_demo: true,
  }).eq('id', pacienteDId)

  await sb.from('medicamentos').insert({
    paciente_id: pacienteDId,
    nombre: 'Metformina',
    dosis: '850mg',
    frecuencia_horas: 12,
    duracion_dias: 90,
    fecha_inicio: ymd(daysAgo(35)),
    activo: true,
    recordatorio_activo: true,
    es_demo: true,
  })

  // 35 días, 85% adherencia, BP mayormente normal con algunos picos
  const registrosDRaw = generarRegistros(pacienteDId, 35, {
    adherenciaRate: 0.85,
    bpLow: [127, 84],
    bpHigh: [143, 90],
    lastRegistro: 0,
  })
  // Añadimos menciones de glucosa en las notas cuando corresponda
  const registrosD = registrosDRaw.map(r => {
    let notas = r.notas
    if (prob(0.3)) {
      const glucosa = randInt(130, 210)
      const sufijo = glucosa > 180 ? ', me siento pesado' : ''
      notas = `Glucosa: ${glucosa} mg/dL${sufijo}`
    }
    return { ...r, bienestar_general: Math.max(r.bienestar_general, 3), notas }
  })
  await insertarRegistros(sb, registrosD)

  return {
    ok: true,
    message:
      'Demo V3 creada: 2 médicos (Molleda + Espinoza), 4 pacientes (verde/amarillo/rojo/verde-amarillo), registros diarios coherentes.',
  }
}

// ── Limpieza ──────────────────────────────────────────────────────────────────

/**
 * Borra TODOS los datos demo (es_demo = true): registros, medicamentos,
 * documentos y perfiles, luego elimina los usuarios de auth demo.
 *
 * El parámetro `_supabase` es aceptado por compatibilidad con la ruta
 * /api/admin/limpiar-demo pero no se usa.
 */
export async function limpiarDemo(
  _supabase?: SupabaseClient,
): Promise<{ ok: boolean }> {
  const sb = createAdminClient()

  // Obtener IDs de todos los perfiles demo
  const { data: perfilesDemo } = await sb
    .from('profiles')
    .select('id')
    .eq('es_demo', true)

  const ids = (perfilesDemo ?? []).map((p: { id: string }) => p.id)

  if (ids.length > 0) {
    // Hijos primero para no violar FK constraints
    await sb.from('registros').delete().in('paciente_id', ids)
    await sb.from('medicamentos').delete().in('paciente_id', ids)
    await sb.from('documentos').delete().in('paciente_id', ids)
    await sb.from('recordatorios').delete().in('paciente_id', ids)
    await sb.from('resumenes').delete().in('paciente_id', ids)
    await sb.from('resumenes').delete().in('medico_id', ids)
    await sb.from('eventos_tracking').delete().in('user_id', ids)
    await sb.from('eventos_tracking').delete().in('medico_id', ids)

    // Desvincular pacientes reales que pudieran apuntar a un médico demo
    await sb.from('profiles').update({ medico_id: null }).in('medico_id', ids)

    // Borrar perfiles
    await sb.from('profiles').delete().in('id', ids)

    // Borrar usuarios de auth
    for (const id of ids) {
      await sb.auth.admin.deleteUser(id).catch(() => {})
    }
  }

  // También intentar borrar por email conocido, por si el perfil no tiene es_demo
  for (const email of DEMO_EMAILS) {
    const { data: found } = await sb.auth.admin.listUsers()
    const user = found?.users?.find(u => u.email === email)
    if (user) {
      await sb.auth.admin.deleteUser(user.id).catch(() => {})
    }
  }

  return { ok: true }
}
