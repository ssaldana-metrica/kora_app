// Generador de datos de demostración (Épica 5).
//
// Crea un médico demo y ~15 pacientes demo realistas (nombres peruanos,
// hipertensión/diabetes, distintos niveles de adherencia y riesgo) con 30–60
// días de registros COHERENTES (la presión sube y baja con tendencia, no al azar).
//
// TODO el contenido se marca con es_demo = true para poder separarlo y borrarlo.
// Requiere service-role: ejecutar solo desde servidor (ver /api/admin/seed-demo).

import type { SupabaseClient } from '@supabase/supabase-js'

const DEMO_MEDICO_EMAIL = 'demo.medico@kora.app'
const DEMO_PASSWORD = 'KoraDemo2026!'

interface PerfilPaciente {
  nombre: string
  enfermedad: string
  control: 'controlado' | 'limitrofe' | 'descontrolado'
  adherencia: 'alta' | 'media' | 'baja'
  engagement: number // prob. de registrar cada día (0–1)
  edad: number
}

const PACIENTES: PerfilPaciente[] = [
  { nombre: 'Rosa Quispe Mamani',      enfermedad: 'Hipertensión',           control: 'controlado',    adherencia: 'alta',  engagement: 0.95, edad: 64 },
  { nombre: 'Julio Huamán Flores',     enfermedad: 'Hipertensión',           control: 'limitrofe',     adherencia: 'media', engagement: 0.8,  edad: 58 },
  { nombre: 'Carmen Rojas Vega',       enfermedad: 'Diabetes tipo 2',        control: 'controlado',    adherencia: 'alta',  engagement: 0.9,  edad: 61 },
  { nombre: 'Pedro Castillo Núñez',    enfermedad: 'Hipertensión',           control: 'descontrolado', adherencia: 'baja',  engagement: 0.45, edad: 70 },
  { nombre: 'Ana Paredes Salinas',     enfermedad: 'Hipertensión',           control: 'limitrofe',     adherencia: 'media', engagement: 0.75, edad: 55 },
  { nombre: 'Luis Mendoza Ramos',      enfermedad: 'Diabetes tipo 2',        control: 'limitrofe',     adherencia: 'media', engagement: 0.7,  edad: 67 },
  { nombre: 'Teresa Aliaga Cárdenas',  enfermedad: 'Hipertensión',           control: 'controlado',    adherencia: 'alta',  engagement: 0.98, edad: 72 },
  { nombre: 'Manuel Chávez Ríos',      enfermedad: 'Hipertensión y diabetes', control: 'descontrolado', adherencia: 'baja',  engagement: 0.4,  edad: 63 },
  { nombre: 'Gloria Espinoza Tello',   enfermedad: 'Hipertensión',           control: 'limitrofe',     adherencia: 'alta',  engagement: 0.85, edad: 59 },
  { nombre: 'Víctor Palomino Soto',    enfermedad: 'Diabetes tipo 2',        control: 'descontrolado', adherencia: 'baja',  engagement: 0.5,  edad: 66 },
  { nombre: 'Elena Vargas Quiroz',     enfermedad: 'Hipertensión',           control: 'controlado',    adherencia: 'media', engagement: 0.78, edad: 60 },
  { nombre: 'Jorge Ttito Apaza',       enfermedad: 'Hipertensión',           control: 'limitrofe',     adherencia: 'media', engagement: 0.72, edad: 68 },
  { nombre: 'Marta Cárdenas Loayza',   enfermedad: 'Diabetes tipo 2',        control: 'controlado',    adherencia: 'alta',  engagement: 0.93, edad: 57 },
  { nombre: 'Raúl Ñahui Condori',      enfermedad: 'Hipertensión',           control: 'descontrolado', adherencia: 'baja',  engagement: 0.55, edad: 74 },
  { nombre: 'Silvia Fernández Lazo',   enfermedad: 'Hipertensión',           control: 'limitrofe',     adherencia: 'alta',  engagement: 0.88, edad: 62 },
]

const BASE_SYS = { controlado: 118, limitrofe: 134, descontrolado: 150 }
const PROB_TOMA = { alta: 0.93, media: 0.72, baja: 0.42 }

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}
function ymd(d: Date) {
  return d.toISOString().split('T')[0]
}

interface RegistroDemo {
  paciente_id: string
  user_id: string
  fecha: string
  presion_sistolica: number | null
  presion_diastolica: number | null
  pulso: number | null
  dolor_cabeza: number | null
  mareos: boolean
  hinchazon: boolean
  tomo_medicamento: boolean
  bienestar_general: number
  notas: string | null
  es_demo: boolean
}

function generarRegistros(pacienteId: string, perfil: PerfilPaciente, dias: number): RegistroDemo[] {
  const registros: RegistroDemo[] = []
  const baseSys = BASE_SYS[perfil.control]
  const probToma = PROB_TOMA[perfil.adherencia]
  const hoy = new Date()

  for (let i = dias - 1; i >= 0; i--) {
    if (Math.random() > perfil.engagement) continue // ese día no registró

    const fecha = new Date(hoy.getTime() - i * 24 * 60 * 60 * 1000)
    // Tendencia: si tiene buena adherencia, la presión baja un poco con el tiempo.
    const progreso = (dias - i) / dias // 0 → 1 a lo largo del periodo
    const mejora = perfil.adherencia === 'alta' ? -8 * progreso : perfil.adherencia === 'media' ? -3 * progreso : 4 * progreso
    const ruido = rand(-6, 6)
    const sys = Math.round(baseSys + mejora + ruido)
    const dia = Math.round(sys * 0.63 + rand(-4, 4))
    const tomo = Math.random() < probToma
    const presionAlta = sys >= 140

    const bienestar = Math.max(1, Math.min(5,
      Math.round((perfil.control === 'controlado' ? 4.2 : perfil.control === 'limitrofe' ? 3.4 : 2.6) + rand(-0.8, 0.8))
    ))

    registros.push({
      paciente_id: pacienteId,
      user_id: pacienteId,
      fecha: ymd(fecha),
      presion_sistolica: sys,
      presion_diastolica: dia,
      pulso: Math.round(rand(62, 84)),
      dolor_cabeza: presionAlta ? Math.round(rand(2, 4)) : Math.round(rand(0, 1)),
      mareos: presionAlta && Math.random() < 0.3,
      hinchazon: Math.random() < 0.15,
      tomo_medicamento: tomo,
      bienestar_general: bienestar,
      notas: !tomo && Math.random() < 0.3 ? 'Olvidé tomar la pastilla' : presionAlta && Math.random() < 0.2 ? 'Me sentí algo mareado' : null,
      es_demo: true,
    })
  }
  return registros
}

export interface ResultadoSeed {
  medicoEmail: string
  medicoPassword: string
  pacientes: number
  registros: number
}

export async function seedDemo(supabase: SupabaseClient): Promise<ResultadoSeed> {
  // Empezamos limpio para que la demo sea idempotente.
  await limpiarDemo(supabase)

  // ── Médico demo ──────────────────────────────────────────────────────────
  const { data: medCreate, error: medErr } = await supabase.auth.admin.createUser({
    email: DEMO_MEDICO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { nombre: 'Dra. Demo KORA', role: 'medico', especialidad: 'Medicina Interna', ubicacion: 'Lima' },
  })
  if (medErr || !medCreate.user) throw new Error(`No se pudo crear el médico demo: ${medErr?.message}`)
  const medicoId = medCreate.user.id
  await supabase.from('profiles').update({ es_demo: true }).eq('id', medicoId)

  // ── Pacientes demo ────────────────────────────────────────────────────────
  let totalRegistros = 0
  for (let idx = 0; idx < PACIENTES.length; idx++) {
    const perfil = PACIENTES[idx]
    const email = `demo.paciente${idx + 1}@kora.app`

    const { data: pCreate, error: pErr } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { nombre: perfil.nombre, role: 'paciente' },
    })
    if (pErr || !pCreate.user) {
      console.error(`No se pudo crear paciente demo ${email}: ${pErr?.message}`)
      continue
    }
    const pacienteId = pCreate.user.id

    const fechaNac = new Date()
    fechaNac.setFullYear(fechaNac.getFullYear() - perfil.edad)

    await supabase.from('profiles').update({
      medico_id: medicoId,
      enfermedad: perfil.enfermedad,
      fecha_nacimiento: ymd(fechaNac),
      es_demo: true,
    }).eq('id', pacienteId)

    // Medicamento demo (activo)
    await supabase.from('medicamentos').insert({
      paciente_id: pacienteId,
      nombre: perfil.enfermedad.includes('Diabetes') ? 'Metformina' : 'Losartán',
      dosis: perfil.enfermedad.includes('Diabetes') ? '850mg' : '50mg',
      frecuencia_horas: 24,
      duracion_dias: 90,
      fecha_inicio: ymd(new Date(Date.now() - 20 * 24 * 60 * 60 * 1000)),
      activo: true,
      recordatorio_activo: true,
      es_demo: true,
    })

    const dias = Math.round(rand(30, 60))
    const registros = generarRegistros(pacienteId, perfil, dias)
    if (registros.length) {
      // Insertar en lotes para no exceder límites
      for (let i = 0; i < registros.length; i += 100) {
        await supabase.from('registros').insert(registros.slice(i, i + 100))
      }
      totalRegistros += registros.length
    }
  }

  return {
    medicoEmail: DEMO_MEDICO_EMAIL,
    medicoPassword: DEMO_PASSWORD,
    pacientes: PACIENTES.length,
    registros: totalRegistros,
  }
}

export interface ResultadoLimpieza {
  perfilesEliminados: number
}

/** Borra TODOS los datos demo (es_demo = true): registros, medicamentos,
 *  recordatorios, resúmenes, eventos y los usuarios de auth correspondientes. */
export async function limpiarDemo(supabase: SupabaseClient): Promise<ResultadoLimpieza> {
  const { data: perfilesDemo } = await supabase
    .from('profiles')
    .select('id')
    .eq('es_demo', true)

  const ids = (perfilesDemo ?? []).map(p => p.id)
  if (!ids.length) return { perfilesEliminados: 0 }

  // Hijos primero (evita violar FKs)
  await supabase.from('registros').delete().in('paciente_id', ids)
  await supabase.from('medicamentos').delete().in('paciente_id', ids)
  await supabase.from('recordatorios').delete().in('paciente_id', ids)
  await supabase.from('resumenes').delete().in('paciente_id', ids)
  await supabase.from('resumenes').delete().in('medico_id', ids)
  await supabase.from('eventos_tracking').delete().in('user_id', ids)
  await supabase.from('eventos_tracking').delete().in('medico_id', ids)

  // Desvincular pacientes reales que apuntaran a un médico demo (por si acaso)
  await supabase.from('profiles').update({ medico_id: null }).in('medico_id', ids)

  await supabase.from('profiles').delete().in('id', ids)

  // Usuarios de auth
  for (const id of ids) {
    await supabase.auth.admin.deleteUser(id).catch(() => {})
  }

  return { perfilesEliminados: ids.length }
}
