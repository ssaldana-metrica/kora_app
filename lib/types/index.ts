export type Role = 'paciente' | 'medico'
export type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'sin-datos'

export interface Paciente {
  id: string
  nombre: string
  email?: string
  enfermedad?: string
  fecha_nacimiento?: string
  medico_id?: string | null
}

export interface Medico {
  id: string
  nombre: string
  especialidad?: string | null
  ubicacion?: string | null
  bio?: string | null
  codigo_medico: string
}

export interface Registro {
  id: string
  paciente_id: string
  fecha: string
  created_at: string
  bienestar_general: number
  tomo_medicamento: boolean | null
  hora_medicamento: string | null
  dolor_cabeza: number | null
  mareos: boolean
  hinchazon: boolean
  presion_sistolica: number | null
  presion_diastolica: number | null
  pulso: number | null
  notas: string | null
}

export interface Medicamento {
  id: string
  paciente_id: string
  nombre: string
  dosis: string
  frecuencia_horas: number
  duracion_dias: number | null
  instrucciones_especiales: string | null
  activo: boolean
  created_at: string
}

export interface Documento {
  id: string
  paciente_id: string
  nombre_archivo: string
  tipo: string
  url: string
  procesado_ia: boolean
  fecha_documento: string | null
  created_at: string
}

export interface Resumen {
  id: string
  paciente_id: string
  medico_id: string
  contenido: string
  created_at: string
}

export interface PacienteConSemaforo extends Paciente {
  semaforo: Semaforo
  diasSinRegistrar: number
  ultimoRegistro?: string
  presion?: { s: number; d: number }
  tomóMedicamentoAyer?: boolean | null
}
