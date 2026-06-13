import { createClient } from '@/lib/supabase/server'
import type { Paciente, PacienteConSemaforo, Semaforo } from '@/lib/types'

export function calcularSemaforo(params: {
  diasSinRegistrar: number
  presion?: { s: number; d: number }
  tomóMedicamentoAyer?: boolean | null
  noMedicamento2DiasConsec?: boolean
  presionAlta2Dias?: boolean
}): Semaforo {
  if (params.diasSinRegistrar > 30) return 'sin-datos'
  if (
    params.diasSinRegistrar > 3 ||
    params.noMedicamento2DiasConsec ||
    params.presionAlta2Dias
  ) return 'rojo'
  if (
    params.diasSinRegistrar >= 2 ||
    params.tomóMedicamentoAyer === false ||
    (params.presion && (params.presion.s >= 130 || params.presion.d >= 85))
  ) return 'amarillo'
  return 'verde'
}

export async function getPaciente(pacienteId: string): Promise<Paciente | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, nombre, email, enfermedad, fecha_nacimiento, medico_id, es_demo')
    .eq('id', pacienteId)
    .single()
  return data ?? null
}

export async function getPacientesDelMedico(medicoId: string): Promise<PacienteConSemaforo[]> {
  const supabase = await createClient()

  const { data: pacientesData } = await supabase
    .from('profiles')
    .select('id, nombre, enfermedad, fecha_nacimiento, es_demo')
    .eq('medico_id', medicoId)
    .eq('role', 'paciente')

  if (!pacientesData?.length) return []

  const ahora = new Date()
  const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const pacientesConDatos: PacienteConSemaforo[] = await Promise.all(
    pacientesData.map(async (p) => {
      const { data: registros } = await supabase
        .from('registros')
        .select('fecha, presion_sistolica, presion_diastolica, tomo_medicamento')
        .eq('paciente_id', p.id)
        .gte('fecha', hace30Dias)
        .order('fecha', { ascending: false })
        .limit(30)

      const ultimoRegistro = registros?.[0]
      const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const anteayer = new Date(ahora.getTime() - 48 * 60 * 60 * 1000).toISOString().split('T')[0]

      let diasSinRegistrar = 0
      if (!ultimoRegistro) {
        diasSinRegistrar = 99
      } else {
        const diff = ahora.getTime() - new Date(ultimoRegistro.fecha).getTime()
        diasSinRegistrar = Math.floor(diff / (1000 * 60 * 60 * 24))
      }

      const registroAyer = registros?.find(r => r.fecha === ayer)
      const tomóMedicamentoAyer = registroAyer ? registroAyer.tomo_medicamento : null
      const registroAnteayer = registros?.find(r => r.fecha === anteayer)
      const noMedicamento2DiasConsec =
        registroAyer?.tomo_medicamento === false &&
        registroAnteayer?.tomo_medicamento === false

      const presion = ultimoRegistro?.presion_sistolica
        ? { s: ultimoRegistro.presion_sistolica, d: ultimoRegistro.presion_diastolica ?? 0 }
        : undefined

      const presionAlta2Dias =
        (registros?.[0]?.presion_sistolica ?? 0) > 140 &&
        (registros?.[1]?.presion_sistolica ?? 0) > 140

      // Adherencia sobre la ventana de 30 días
      const totalReg = registros?.length ?? 0
      const tomados = registros?.filter(r => r.tomo_medicamento).length ?? 0
      const adherencia = totalReg ? Math.round((tomados / totalReg) * 100) : 0

      // Presión >140/90 tres días consecutivos
      const presionAlta3Dias = (registros ?? []).slice(0, 3).length === 3 &&
        (registros ?? []).slice(0, 3).every(
          r => (r.presion_sistolica ?? 0) > 140 || (r.presion_diastolica ?? 0) > 90
        )

      const semaforo = calcularSemaforo({
        diasSinRegistrar,
        presion,
        tomóMedicamentoAyer,
        noMedicamento2DiasConsec,
        presionAlta2Dias: presionAlta2Dias || presionAlta3Dias,
      })

      // Motivos clínicos concretos para el panel de alertas
      const motivosAlerta: string[] = []
      if (diasSinRegistrar >= 5 && diasSinRegistrar < 99)
        motivosAlerta.push(`Sin registrar hace ${diasSinRegistrar} días`)
      if (diasSinRegistrar === 99) motivosAlerta.push('Nunca ha registrado')
      if (presionAlta3Dias) motivosAlerta.push('Presión alta 3 días seguidos')
      if (totalReg >= 3 && adherencia < 50)
        motivosAlerta.push(`Adherencia baja (${adherencia}%)`)

      return {
        id: p.id,
        nombre: p.nombre,
        enfermedad: p.enfermedad,
        fecha_nacimiento: p.fecha_nacimiento,
        es_demo: p.es_demo,
        ultimoRegistro: ultimoRegistro?.fecha,
        presion,
        tomóMedicamentoAyer,
        adherencia,
        semaforo,
        diasSinRegistrar,
        motivosAlerta,
      }
    })
  )

  const orden = { rojo: 0, amarillo: 1, verde: 2, 'sin-datos': 3 }
  return pacientesConDatos.sort((a, b) => orden[a.semaforo] - orden[b.semaforo])
}

export async function buscarMedicos(query: string): Promise<Array<{
  id: string
  nombre: string
  especialidad: string | null
  ubicacion: string | null
}>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, nombre, especialidad, ubicacion')
    .eq('role', 'medico')
    .ilike('nombre', `%${query}%`)
    .limit(10)
  return data ?? []
}

export async function vincularMedico(pacienteId: string, medicoId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({ medico_id: medicoId })
    .eq('id', pacienteId)
}
