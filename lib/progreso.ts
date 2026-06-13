// Utilidades de progreso del paciente (Épica 3). Funciones PURAS, sin imports
// de servidor, para poder usarse tanto en componentes cliente como en API routes.

export interface RegistroFecha {
  fecha: string // YYYY-MM-DD
  tomo_medicamento?: boolean | null
  presion_sistolica?: number | null
  presion_diastolica?: number | null
}

function ymd(d: Date): string {
  return d.toISOString().split('T')[0]
}

/**
 * Racha de días consecutivos con al menos un registro, contando hacia atrás
 * desde hoy (o ayer si aún no registró hoy, para no romper la racha durante el día).
 */
export function calcularRacha(registros: RegistroFecha[]): number {
  if (!registros.length) return 0
  const fechas = new Set(registros.map(r => r.fecha))

  const hoy = new Date()
  const hoyStr = ymd(hoy)
  const ayer = new Date(hoy.getTime() - 24 * 60 * 60 * 1000)

  // Punto de partida: hoy si registró hoy, si no ayer.
  const cursor = fechas.has(hoyStr) ? hoy : ayer
  let racha = 0
  while (fechas.has(ymd(cursor))) {
    racha++
    cursor.setDate(cursor.getDate() - 1)
  }
  return racha
}

/** % de días (sobre los registros dados) en que tomó el medicamento. */
export function calcularAdherencia(registros: RegistroFecha[]): number {
  if (!registros.length) return 0
  const tomados = registros.filter(r => r.tomo_medicamento).length
  return Math.round((tomados / registros.length) * 100)
}

/** Mensaje de hito de racha (sin gamificación infantil; usuario adulto mayor). */
export function mensajeHito(racha: number): string | null {
  if (racha >= 90) return '¡90 días cuidándote! Un hábito sólido para tu salud.'
  if (racha >= 30) return '¡30 días seguidos! Tu constancia marca la diferencia.'
  if (racha >= 7) return '¡Una semana completa! Vas muy bien.'
  return null
}
