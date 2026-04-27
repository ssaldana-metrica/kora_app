'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  Copy,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Activity,
  Pill,
  LogOut,
  RefreshCw,
  ChevronRight,
  Stethoscope,
} from 'lucide-react'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface Paciente {
  id: string
  nombre: string
  enfermedad?: string
  edad?: number
  ultimoRegistro?: string
  presion?: { s: number; d: number }
  tomóMedicamentoAyer?: boolean | null
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'sin-datos'
  diasSinRegistrar: number
}

interface MedicoProfile {
  nombre: string
  codigo_medico: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

function calcularSemaforo(paciente: {
  diasSinRegistrar: number
  presion?: { s: number; d: number }
  tomóMedicamentoAyer?: boolean | null
  noMedicamento2DiasConsec?: boolean
  presionAlta2Dias?: boolean
}): 'verde' | 'amarillo' | 'rojo' | 'sin-datos' {
  if (paciente.diasSinRegistrar > 30) return 'sin-datos'

  if (
    paciente.diasSinRegistrar > 3 ||
    paciente.noMedicamento2DiasConsec ||
    paciente.presionAlta2Dias
  ) return 'rojo'

  if (
    paciente.diasSinRegistrar >= 2 ||
    paciente.tomóMedicamentoAyer === false ||
    (paciente.presion &&
      (paciente.presion.s >= 130 || paciente.presion.d >= 85))
  ) return 'amarillo'

  return 'verde'
}

function tiempoDesde(fechaISO: string): string {
  const ahora = new Date()
  const fecha = new Date(fechaISO)
  const diffMs = ahora.getTime() - fecha.getTime()
  const diffHoras = diffMs / (1000 * 60 * 60)
  const diffDias = diffHoras / 24

  if (diffHoras < 1) return 'Hace menos de 1h'
  if (diffHoras < 24) return 'Hoy'
  if (diffDias < 2) return 'Ayer'
  if (diffDias < 7) return `Hace ${Math.floor(diffDias)} días`
  return `Hace ${Math.floor(diffDias / 7)} semanas`
}

// ── Tarjeta paciente ───────────────────────────────────────────────────────

function TarjetaPaciente({ paciente }: { paciente: Paciente }) {
  const semaforoConfig = {
    verde: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-700',
      dot: 'bg-emerald-500',
      icon: CheckCircle,
      label: 'Bien',
    },
    amarillo: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      badge: 'bg-amber-100 text-amber-700',
      dot: 'bg-amber-400',
      icon: AlertCircle,
      label: 'Atención',
    },
    rojo: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      badge: 'bg-red-100 text-red-700',
      dot: 'bg-red-500',
      icon: XCircle,
      label: 'Alerta',
    },
    'sin-datos': {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      badge: 'bg-gray-100 text-gray-500',
      dot: 'bg-gray-400',
      icon: Clock,
      label: 'Sin datos',
    },
  }

  const cfg = semaforoConfig[paciente.semaforo]

  return (
    <Link href={`/medico/paciente/${paciente.id}`}>
      <div
        className={`
          relative rounded-xl border-2 ${cfg.border} ${cfg.bg}
          p-5 cursor-pointer transition-all duration-200
          hover:shadow-md hover:-translate-y-0.5
          group
        `}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-base leading-tight">
              {paciente.nombre}
            </h3>
            {paciente.enfermedad && (
              <p className="text-xs text-gray-500 mt-0.5">{paciente.enfermedad}</p>
            )}
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.badge}`}>
            <span className={`w-2 h-2 rounded-full ${cfg.dot} inline-block`} />
            {cfg.label}
          </span>
        </div>

        <div className="space-y-2 mt-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock size={14} className="text-gray-400 flex-shrink-0" />
            <span>
              {paciente.ultimoRegistro
                ? tiempoDesde(paciente.ultimoRegistro)
                : 'Sin registros aún'}
            </span>
          </div>

          {paciente.presion ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Activity size={14} className="text-gray-400 flex-shrink-0" />
              <span>
                Presión:{' '}
                <span className={`font-semibold ${
                  paciente.presion.s >= 140 || paciente.presion.d >= 90
                    ? 'text-red-600'
                    : paciente.presion.s >= 130 || paciente.presion.d >= 85
                    ? 'text-amber-600'
                    : 'text-emerald-700'
                }`}>
                  {paciente.presion.s}/{paciente.presion.d}
                </span>{' '}
                mmHg
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Activity size={14} className="flex-shrink-0" />
              <span>Sin presión registrada</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Pill size={14} className="text-gray-400 flex-shrink-0" />
            <span>
              Medicamento ayer:{' '}
              {paciente.tomóMedicamentoAyer === true ? (
                <span className="text-emerald-600 font-medium">✓ Tomó</span>
              ) : paciente.tomóMedicamentoAyer === false ? (
                <span className="text-red-600 font-medium">✗ No tomó</span>
              ) : (
                <span className="text-gray-400">Sin dato</span>
              )}
            </span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
          <span className="text-xs text-[#0d3d7a] font-medium">Ver detalle</span>
          <ChevronRight
            size={16}
            className="text-[#0d3d7a] group-hover:translate-x-1 transition-transform"
          />
        </div>
      </div>
    </Link>
  )
}

// ── Página principal ───────────────────────────────────────────────────────

export default function MedicoDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [medico, setMedico] = useState<MedicoProfile | null>(null)
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'verde' | 'amarillo' | 'rojo'>('todos')

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: perfil } = await supabase
        .from('profiles')
        .select('nombre, codigo_medico, role')
        .eq('id', user.id)
        .single()

      if (!perfil || perfil.role !== 'medico') {
        router.push('/login')
        return
      }

      setMedico({ nombre: perfil.nombre, codigo_medico: perfil.codigo_medico })

      const { data: pacientesData } = await supabase
        .from('profiles')
        .select('id, nombre, enfermedad, fecha_nacimiento')
        .eq('medico_id', user.id)
        .eq('role', 'paciente')

      if (!pacientesData || pacientesData.length === 0) {
        setPacientes([])
        setLoading(false)
        return
      }

      const ahora = new Date()
      const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]

      const pacientesConDatos: Paciente[] = await Promise.all(
        pacientesData.map(async (p) => {
          const { data: registros } = await supabase
            .from('registros')
            .select('fecha, presion_sistolica, presion_diastolica, tomo_medicamento') // ✅ CORREGIDO
            .eq('paciente_id', p.id)
            .gte('fecha', hace30Dias)
            .order('fecha', { ascending: false })
            .limit(7)

          const ultimoRegistro = registros?.[0]
          const ayer = new Date(ahora.getTime() - 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]
          const anteayer = new Date(ahora.getTime() - 48 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0]

          let diasSinRegistrar = 0
          if (!ultimoRegistro) {
            diasSinRegistrar = 99
          } else {
            const diff = ahora.getTime() - new Date(ultimoRegistro.fecha).getTime()
            diasSinRegistrar = Math.floor(diff / (1000 * 60 * 60 * 24))
          }

          const registroAyer = registros?.find(r => r.fecha === ayer)
          const tomóMedicamentoAyer = registroAyer
            ? registroAyer.tomo_medicamento  // ✅ CORREGIDO
            : null

          const registroAnteayer = registros?.find(r => r.fecha === anteayer)
          const noMedicamento2DiasConsec =
            registroAyer?.tomo_medicamento === false &&      // ✅ CORREGIDO
            registroAnteayer?.tomo_medicamento === false     // ✅ CORREGIDO

          const presion = ultimoRegistro?.presion_sistolica
            ? { s: ultimoRegistro.presion_sistolica, d: ultimoRegistro.presion_diastolica ?? 0 }
            : undefined

          const presionAlta2Dias =
            (registros?.[0]?.presion_sistolica ?? 0) > 140 &&
            (registros?.[1]?.presion_sistolica ?? 0) > 140

          let edad: number | undefined
          if (p.fecha_nacimiento) {
            edad = Math.floor(
              (ahora.getTime() - new Date(p.fecha_nacimiento).getTime()) /
                (1000 * 60 * 60 * 24 * 365.25)
            )
          }

          const semaforo = calcularSemaforo({
            diasSinRegistrar,
            presion,
            tomóMedicamentoAyer,
            noMedicamento2DiasConsec,
            presionAlta2Dias,
          })

          return {
            id: p.id,
            nombre: p.nombre,
            enfermedad: p.enfermedad,
            edad,
            ultimoRegistro: ultimoRegistro?.fecha,
            presion,
            tomóMedicamentoAyer,
            semaforo,
            diasSinRegistrar,
          }
        })
      )

      const orden = { rojo: 0, amarillo: 1, verde: 2, 'sin-datos': 3 }
      pacientesConDatos.sort((a, b) => orden[a.semaforo] - orden[b.semaforo])
      setPacientes(pacientesConDatos)
    } catch (err) {
      console.error('Error cargando dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function copiarCodigo() {
    if (medico?.codigo_medico) {
      navigator.clipboard.writeText(medico.codigo_medico)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  const pacientesFiltrados =
    filtro === 'todos'
      ? pacientes
      : pacientes.filter(p => p.semaforo === filtro)

  const conteos = {
    verde: pacientes.filter(p => p.semaforo === 'verde').length,
    amarillo: pacientes.filter(p => p.semaforo === 'amarillo').length,
    rojo: pacientes.filter(p => p.semaforo === 'rojo').length,
  }

  function saludo() {
    const hora = new Date().getHours()
    if (hora < 12) return 'Buenos días'
    if (hora < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const apellido = medico?.nombre?.split(' ').slice(-1)[0] ?? ''

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#0d3d7a] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando pacientes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-[#0d3d7a] text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <Stethoscope size={20} />
              </div>
              <div>
                <p className="text-blue-200 text-xs font-medium">KORA · Plataforma Médica</p>
                <h1 className="font-bold text-lg leading-tight">
                  {saludo()}, Dr. {apellido}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={cargarDatos}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Actualizar"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={cerrarSesion}
                className="flex items-center gap-1.5 text-sm bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition-colors"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Código del médico */}
        <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Tu código único KORA
              </p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-[#0d3d7a] tracking-widest font-mono">
                  {medico?.codigo_medico ?? '—'}
                </span>
                <button
                  onClick={copiarCodigo}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    copiado
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {copiado ? <CheckCircle size={13} /> : <Copy size={13} />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 max-w-xs">
              Comparte este código con tus pacientes para que se vinculen a tu cuenta.
            </p>
          </div>
        </div>

        {/* Resumen numérico */}
        {pacientes.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { color: 'emerald', label: 'Bien',     count: conteos.verde,    semaforo: 'verde'    as const },
              { color: 'amber',   label: 'Atención', count: conteos.amarillo, semaforo: 'amarillo' as const },
              { color: 'red',     label: 'Alerta',   count: conteos.rojo,     semaforo: 'rojo'     as const },
            ].map(({ color, label, count, semaforo }) => (
              <button
                key={semaforo}
                onClick={() => setFiltro(filtro === semaforo ? 'todos' : semaforo)}
                className={`
                  rounded-xl p-4 text-center border-2 transition-all shadow-sm
                  ${filtro === semaforo
                    ? `border-${color}-400 bg-${color}-50`
                    : 'border-transparent bg-white hover:bg-gray-50'
                  }
                `}
              >
                <p className={`text-3xl font-bold text-${color}-600`}>{count}</p>
                <p className={`text-xs font-medium text-${color}-700 mt-0.5`}>{label}</p>
              </button>
            ))}
          </div>
        )}

        {/* Grid de pacientes */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-[#0d3d7a]" />
              {filtro === 'todos'
                ? `Todos los pacientes (${pacientes.length})`
                : `Filtro: ${filtro} (${pacientesFiltrados.length})`}
            </h2>
            {filtro !== 'todos' && (
              <button
                onClick={() => setFiltro('todos')}
                className="text-xs text-[#0d3d7a] hover:underline"
              >
                Ver todos
              </button>
            )}
          </div>

          {pacientes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users size={28} className="text-[#0d3d7a]" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Aún no tienes pacientes</h3>
              <p className="text-gray-500 text-sm mb-4 max-w-sm mx-auto">
                Comparte tu código{' '}
                <span className="font-bold text-[#0d3d7a] font-mono">
                  {medico?.codigo_medico}
                </span>{' '}
                con tus pacientes para que se vinculen.
              </p>
              <button
                onClick={copiarCodigo}
                className="flex items-center gap-2 mx-auto bg-[#0d3d7a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0b3268] transition-colors"
              >
                {copiado ? <CheckCircle size={15} /> : <Copy size={15} />}
                {copiado ? '¡Copiado!' : 'Copiar mi código'}
              </button>
            </div>
          ) : pacientesFiltrados.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
              No hay pacientes en esta categoría.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pacientesFiltrados.map(p => (
                <TarjetaPaciente key={p.id} paciente={p} />
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  )
} 