'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Copy,
  CheckCircle,
  LogOut,
  ChevronRight,
  Stethoscope,
  QrCode,
  Users,
} from 'lucide-react'
import DemoBadge from '@/components/DemoBadge'

export const dynamic = 'force-dynamic'

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
  adherencia?: number
  motivosAlerta?: string[]
  es_demo?: boolean
}

interface MedicoProfile {
  nombre: string
  apellido?: string
  especialidad?: string
  role?: string
  codigo_medico: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

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

function datoClave(paciente: Paciente): string {
  if (paciente.presion) {
    const diasTexto =
      paciente.diasSinRegistrar > 0
        ? ` · ${paciente.diasSinRegistrar} días alto`
        : ''
    return `${paciente.presion.s}/${paciente.presion.d}${diasTexto}`
  }
  if (paciente.adherencia != null) {
    return `Adherencia ${paciente.adherencia}%`
  }
  if (paciente.ultimoRegistro) {
    return tiempoDesde(paciente.ultimoRegistro)
  }
  return 'Sin registros aún'
}

const SEMAFORO_ORDER: Record<Paciente['semaforo'], number> = {
  rojo: 0,
  amarillo: 1,
  verde: 2,
  'sin-datos': 3,
}

function ordenarPorRiesgo(lista: Paciente[]): Paciente[] {
  return [...lista].sort(
    (a, b) => SEMAFORO_ORDER[a.semaforo] - SEMAFORO_ORDER[b.semaforo],
  )
}

// ── Panel de alertas ─────────────────────────────────────────────────────

function PanelAlertas({ pacientes }: { pacientes: Paciente[] }) {
  const enRiesgo = pacientes
    .filter(p => (p.motivosAlerta?.length ?? 0) > 0)
    .sort((a, b) => (b.motivosAlerta?.length ?? 0) - (a.motivosAlerta?.length ?? 0))

  if (enRiesgo.length === 0) return null

  return (
    <div
      className="mx-4 mt-4 rounded-[16px] p-4 border-l-4 border-[#E0533D]"
      style={{ background: 'rgba(224,83,61,0.08)' }}
    >
      <p className="font-bold text-[#E0533D] mb-3">
        ⚠ {enRiesgo.length === 1
          ? '1 paciente necesita tu atención'
          : `${enRiesgo.length} pacientes necesitan tu atención`}
      </p>
      <div className="space-y-2">
        {enRiesgo.map(p => (
          <Link
            key={p.id}
            href={`/medico/paciente/${p.id}`}
            className="flex items-center justify-between gap-3 bg-white rounded-[12px] px-3 py-2.5 border border-[#E0533D]/20 hover:border-[#E0533D]/50 transition-colors"
          >
            <div className="min-w-0">
              <p className="font-semibold text-[#0E1B2A] text-sm truncate">{p.nombre}</p>
              <p className="text-xs text-[#E0533D] truncate">
                {p.motivosAlerta?.[0]}
              </p>
            </div>
            <ChevronRight size={16} className="text-[#E0533D] flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Tarjeta paciente ───────────────────────────────────────────────────────

function TarjetaPaciente({ paciente }: { paciente: Paciente }) {
  const avatarConfig = {
    rojo: {
      avatarBg: 'bg-[#E0533D]/10',
      avatarText: 'text-[#E0533D]',
      tagBg: 'bg-[#E0533D]/10',
      tagText: 'text-[#E0533D]',
      label: 'Alerta',
    },
    amarillo: {
      avatarBg: 'bg-[#E8A317]/10',
      avatarText: 'text-[#E8A317]',
      tagBg: 'bg-[#E8A317]/10',
      tagText: 'text-[#E8A317]',
      label: 'Atención',
    },
    verde: {
      avatarBg: 'bg-[#16A571]/10',
      avatarText: 'text-[#16A571]',
      tagBg: 'bg-[#16A571]/10',
      tagText: 'text-[#16A571]',
      label: 'Bien',
    },
    'sin-datos': {
      avatarBg: 'bg-gray-100',
      avatarText: 'text-gray-500',
      tagBg: 'bg-gray-100',
      tagText: 'text-gray-500',
      label: 'Sin datos',
    },
  }

  const cfg = avatarConfig[paciente.semaforo]
  const inicial = paciente.nombre.trim().charAt(0).toUpperCase()

  return (
    <Link href={`/medico/paciente/${paciente.id}`}>
      <div
        className="bg-white rounded-[20px] border border-[#E5EAF0] shadow p-4 w-full flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
        style={{ minHeight: '72px' }}
      >
        {/* Avatar */}
        <div
          className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center ${cfg.avatarBg} ${cfg.avatarText} text-xl font-bold`}
        >
          {inicial}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#0E1B2A] text-base leading-tight truncate">
            {paciente.nombre}
          </p>
          <p className="text-sm text-[#5B6B7C] truncate mt-0.5">
            {datoClave(paciente)}
          </p>
          {paciente.es_demo && <DemoBadge className="mt-1" />}
        </div>

        {/* Right: tag + chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.tagBg} ${cfg.tagText}`}
          >
            {cfg.label}
          </span>
          <ChevronRight size={18} className="text-[#5B6B7C]" />
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
        .select('nombre, apellido, especialidad, codigo_medico, role')
        .eq('id', user.id)
        .single()

      if (!perfil || perfil.role !== 'medico') {
        router.push('/login')
        return
      }

      setMedico({
        nombre: perfil.nombre,
        apellido: perfil.apellido,
        especialidad: perfil.especialidad,
        codigo_medico: perfil.codigo_medico,
      })

      const res = await fetch('/api/medicos/pacientes')
      if (res.ok) {
        const pacientesConDatos = await res.json()
        setPacientes(pacientesConDatos)
      }
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

  function saludo() {
    const hora = new Date().getHours()
    if (hora < 12) return 'Buenos días'
    if (hora < 19) return 'Buenas tardes'
    return 'Buenas noches'
  }

  const apellido =
    medico?.apellido ?? medico?.nombre?.split(' ').slice(-1)[0] ?? ''

  const especialidad = medico?.especialidad ?? 'Médico'

  const pacientesFiltrados =
    filtro === 'todos'
      ? pacientes
      : pacientes.filter(p => p.semaforo === filtro)

  const ordenados = ordenarPorRiesgo(pacientesFiltrados)

  const prioridad = ordenados.filter(
    p => p.semaforo === 'rojo' || p.semaforo === 'amarillo',
  )
  const controlados = ordenados.filter(p => p.semaforo === 'verde')
  const sinDatos = ordenados.filter(p => p.semaforo === 'sin-datos')

  const conteos = {
    verde: pacientes.filter(p => p.semaforo === 'verde').length,
    rojo: pacientes.filter(p => p.semaforo === 'rojo').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#0B2A4A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-[#5B6B7C] text-sm">Cargando pacientes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F6F9]">

      {/* ── Header ── */}
      <header
        className="w-full pt-12 pb-6 px-5"
        style={{ background: 'linear-gradient(135deg, #0B2A4A 0%, #123A63 100%)' }}
      >
        {/* Row 1: brand */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Stethoscope size={24} className="text-white" />
            <span className="text-sm font-bold text-white/60">KORA</span>
            <span className="text-sm text-white/40">· Plataforma Clínica</span>
          </div>
          {/* Icon buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/medico/escanear"
              className="flex items-center justify-center w-9 h-9 rounded-[12px] transition-colors"
              style={{ background: 'rgba(255,255,255,0.2)' }}
              title="Escanear QR del paciente"
            >
              <QrCode size={18} className="text-white" />
            </Link>
            <button
              onClick={cerrarSesion}
              className="flex items-center justify-center w-9 h-9 rounded-[12px] transition-colors"
              style={{ background: 'rgba(255,255,255,0.2)' }}
              title="Cerrar sesión"
            >
              <LogOut size={18} className="text-white" />
            </button>
          </div>
        </div>

        {/* Row 2: greeting */}
        <h1 className="text-2xl font-extrabold text-white mt-1">
          {saludo()}, Dr. {apellido}
        </h1>

        {/* Row 3: speciality */}
        <p className="text-sm text-blue-200 mt-0.5">{especialidad}</p>
      </header>

      {/* ── Alert panel ── */}
      <PanelAlertas pacientes={pacientes} />

      <div className="px-4 pb-10 space-y-5 mt-5">

        {/* ── Stats row ── */}
        {pacientes.length > 0 && (
          <div className="bg-white rounded-[20px] border border-[#E5EAF0] p-4 grid grid-cols-3 divide-x divide-[#E5EAF0]">
            <div className="flex flex-col items-center px-2">
              <span className="text-3xl font-extrabold text-[#0E1B2A]">{pacientes.length}</span>
              <span className="text-xs text-[#5B6B7C] text-center mt-0.5">pacientes</span>
            </div>
            <div className="flex flex-col items-center px-2">
              <span className="text-3xl font-extrabold text-[#0E1B2A]">{conteos.verde}</span>
              <span className="text-xs text-[#5B6B7C] text-center mt-0.5">controlados</span>
            </div>
            <div className="flex flex-col items-center px-2">
              <span className="text-3xl font-extrabold text-[#0E1B2A]">{conteos.rojo}</span>
              <span className="text-xs text-[#5B6B7C] text-center mt-0.5">en alerta</span>
            </div>
          </div>
        )}

        {/* ── Filter chips ── */}
        {pacientes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(
              [
                { key: 'todos', label: 'Todos', count: pacientes.length },
                { key: 'rojo', label: 'Alerta', count: pacientes.filter(p => p.semaforo === 'rojo').length },
                { key: 'amarillo', label: 'Atención', count: pacientes.filter(p => p.semaforo === 'amarillo').length },
                { key: 'verde', label: 'Bien', count: conteos.verde },
              ] as const
            ).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                  filtro === key
                    ? 'bg-[#0B2A4A] text-white border-[#0B2A4A]'
                    : 'bg-white text-[#5B6B7C] border-[#E5EAF0] hover:border-[#0B2A4A]/30'
                }`}
              >
                {label} {count > 0 && <span className="opacity-70">({count})</span>}
              </button>
            ))}
          </div>
        )}

        {/* ── Patient list ── */}
        {pacientes.length === 0 ? (
          <div className="bg-white rounded-[20px] border border-[#E5EAF0] p-10 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-[#0B2A4A]" />
            </div>
            <h3 className="font-bold text-[#0E1B2A] mb-1">Aún no tienes pacientes</h3>
            <p className="text-[#5B6B7C] text-sm mb-4 max-w-sm mx-auto">
              Comparte tu código{' '}
              <span className="font-bold text-[#0B2A4A] font-mono">
                {medico?.codigo_medico}
              </span>{' '}
              con tus pacientes para que se vinculen.
            </p>
            <button
              onClick={copiarCodigo}
              className="flex items-center gap-2 mx-auto bg-[#0B2A4A] text-white px-4 py-2 rounded-[12px] text-sm font-medium hover:bg-[#123A63] transition-colors"
            >
              {copiado ? <CheckCircle size={15} /> : <Copy size={15} />}
              {copiado ? '¡Copiado!' : 'Copiar mi código'}
            </button>
          </div>
        ) : pacientesFiltrados.length === 0 ? (
          <div className="bg-white rounded-[20px] border border-[#E5EAF0] p-8 text-center text-[#5B6B7C]">
            No hay pacientes en esta categoría.
          </div>
        ) : (
          <div className="space-y-3">

            {/* Prioridad alta */}
            {prioridad.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#5B6B7C] mb-2 mt-4 px-1">
                  Prioridad alta
                </p>
                <div className="space-y-3">
                  {prioridad.map(p => (
                    <TarjetaPaciente key={p.id} paciente={p} />
                  ))}
                </div>
              </div>
            )}

            {/* Controlados */}
            {controlados.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#5B6B7C] mb-2 mt-4 px-1">
                  Controlados
                </p>
                <div className="space-y-3">
                  {controlados.map(p => (
                    <TarjetaPaciente key={p.id} paciente={p} />
                  ))}
                </div>
              </div>
            )}

            {/* Sin datos */}
            {sinDatos.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#5B6B7C] mb-2 mt-4 px-1">
                  Sin datos recientes
                </p>
                <div className="space-y-3">
                  {sinDatos.map(p => (
                    <TarjetaPaciente key={p.id} paciente={p} />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── Código médico card ── */}
        <div className="bg-white rounded-[20px] border border-[#E5EAF0] p-5">
          <p className="text-xs uppercase tracking-widest text-[#5B6B7C] mb-2">
            Tu código KORA
          </p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-2xl font-bold tracking-widest text-[#0B2A4A] font-mono">
              {medico?.codigo_medico ?? '—'}
            </span>
            <button
              onClick={copiarCodigo}
              className="flex items-center gap-1.5 bg-[#E6F4F4] text-[#0E9594] rounded-[12px] px-3 py-1.5 text-sm font-medium hover:bg-[#d0ecec] transition-colors flex-shrink-0"
            >
              {copiado ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copiado ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="text-xs text-[#5B6B7C] mt-2">
            Comparte este código con tus pacientes para que se vinculen a tu cuenta.
          </p>
        </div>

      </div>
    </div>
  )
}
