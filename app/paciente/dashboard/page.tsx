'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  ClipboardList,
  FileText,
  User,
  CheckCircle2,
  XCircle,
  Pill,
  Camera,
  Activity,
  MessageCircle,
  FolderOpen,
} from 'lucide-react'
import { calcularRacha } from '@/lib/progreso'

export const dynamic = 'force-dynamic'

interface Profile {
  nombre: string
  email: string
}

interface Registro {
  id: string
  created_at: string
  bienestar_general: number
  tomo_medicamento: boolean | null
}

interface Medicamento {
  id: string
  nombre: string
  dosis: string
  frecuencia_horas: number
  activo: boolean
}

interface LastBP {
  presion_sistolica: number
  presion_diastolica: number
  fecha: string
}

function getSaludo(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

function hoyISO() {
  return new Date().toISOString().split('T')[0]
}

function timeAgo(fechaStr: string): string {
  const fecha = new Date(fechaStr)
  const ahora = new Date()
  const diffMs = ahora.getTime() - fecha.getTime()
  const diffH = Math.floor(diffMs / (1000 * 60 * 60))
  const diffD = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffH < 1) return 'hace menos de 1 hora'
  if (diffH < 24) return `hace ${diffH} h`
  if (diffD === 1) return 'ayer'
  return `hace ${diffD} días`
}

const NAV = [
  { href: '/paciente/dashboard', label: 'Inicio', Icon: Home },
  { href: '/paciente/registrar', label: 'Registrar', Icon: ClipboardList },
  { href: '/paciente/chat', label: 'Chat', Icon: MessageCircle },
  { href: '/paciente/historial', label: 'Historial', Icon: FileText },
  { href: '/paciente/perfil', label: 'Perfil', Icon: User },
]

// SparklineBP: renders a thin teal path for the last N systolic readings.
// Values are passed in descending order (newest first), so we reverse them.
function SparklineBP({ values }: { values: number[] }) {
  if (values.length < 2) return null
  const pts = [...values].reverse()
  const w = 120
  const h = 40
  const min = Math.min(...pts) - 5
  const max = Math.max(...pts) + 5
  const range = max - min || 1
  const xStep = w / (pts.length - 1)
  const coords = pts.map((v, i) => {
    const x = i * xStep
    const y = h - ((v - min) / range) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const d = `M ${coords.join(' L ')}`
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      style={{ display: 'block' }}
    >
      <path d={d} stroke="#0E9594" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PacienteDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [registroHoy, setRegistroHoy] = useState<Registro | null>(null)
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [racha, setRacha] = useState(0)
  const [lastBP, setLastBP] = useState<LastBP | null>(null)
  const [bpHistory, setBpHistory] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  const saludo = getSaludo()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Perfil
      const { data: perfil } = await supabase
        .from('profiles')
        .select('nombre, email')
        .eq('id', user.id)
        .single()

      setProfile(perfil)

      // Registro de hoy — filtra por fecha (columna date)
      const { data: reg } = await supabase
        .from('registros')
        .select('id, created_at, bienestar_general, tomo_medicamento')
        .eq('paciente_id', user.id)
        .eq('fecha', hoyISO())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setRegistroHoy(reg ?? null)

      // Medicamentos activos
      const { data: meds } = await supabase
        .from('medicamentos')
        .select('id, nombre, dosis, frecuencia_horas, activo')
        .eq('paciente_id', user.id)
        .eq('activo', true)

      setMedicamentos(meds ?? [])

      // Racha de días consecutivos (últimos 30 días)
      const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data: ultimos } = await supabase
        .from('registros')
        .select('fecha')
        .eq('paciente_id', user.id)
        .gte('fecha', hace30)
        .order('fecha', { ascending: false })
      setRacha(calcularRacha(ultimos ?? []))

      // Última presión arterial
      const { data: bp } = await supabase
        .from('registros')
        .select('presion_sistolica, presion_diastolica, fecha, created_at')
        .eq('paciente_id', user.id)
        .not('presion_sistolica', 'is', null)
        .order('fecha', { ascending: false })
        .limit(1)
        .maybeSingle()

      setLastBP(bp ?? null)

      // Historial sparkline — últimas 7 lecturas con presión
      const { data: bpHist } = await supabase
        .from('registros')
        .select('presion_sistolica')
        .eq('paciente_id', user.id)
        .not('presion_sistolica', 'is', null)
        .order('fecha', { ascending: false })
        .limit(7)

      setBpHistory((bpHist ?? []).map((r: { presion_sistolica: number }) => r.presion_sistolica))

      setLoading(false)
    }

    cargar()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faff]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#0E9594] border-t-transparent animate-spin" />
          <p className="text-[#0E9594] text-lg font-medium">Cargando…</p>
        </div>
      </div>
    )
  }

  const primerNombre = profile?.nombre?.split(' ')[0] ?? 'Paciente'

  const bpInRange =
    lastBP !== null &&
    lastBP.presion_sistolica <= 130 &&
    lastBP.presion_diastolica <= 85

  return (
    <div className="min-h-screen bg-[#f8faff] pb-28">
      {/* 1. HEADER */}
      <header
        style={{ background: 'linear-gradient(135deg, #0B2A4A 0%, #123A63 100%)' }}
        className="pt-12 pb-6 px-5 text-white"
      >
        <p className="text-sm text-blue-200">{saludo}</p>
        <h1 className="text-2xl font-extrabold text-white leading-tight mt-0.5">
          {primerNombre}
        </h1>
        {racha > 0 && (
          <p className="text-sm text-orange-300 font-semibold mt-1">
            🔥 {racha} {racha === 1 ? 'día' : 'días'} seguidos cuidándote
          </p>
        )}
        <svg height="2" style={{ width: '100%', opacity: 0.15 }} className="mt-4">
          <line x1="0" y1="1" x2="100%" y2="1" stroke="white" strokeWidth="2" />
        </svg>
      </header>

      <main className="flex flex-col gap-4 max-w-lg mx-auto">
        {/* 2. HERO CARD — Última presión */}
        <div className="bg-white rounded-[20px] shadow border border-[#E5EAF0] mx-4 mt-4 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={18} className="text-[#0E9594]" />
            <span className="text-sm font-semibold text-[#5B6B7C]">Presión arterial</span>
          </div>

          {lastBP ? (
            <>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-5xl font-extrabold text-[#0E1B2A] tracking-tight">
                  {lastBP.presion_sistolica}/{lastBP.presion_diastolica}
                </span>
                <span className="text-base text-[#5B6B7C] ml-1">mmHg</span>
              </div>

              <div className="flex items-center gap-3 mb-2">
                {bpInRange ? (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E6F4F4] text-[#16A571]">
                    En rango ✓
                  </span>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
                    Revisar ⚠
                  </span>
                )}
                <span className="text-xs text-[#5B6B7C]">
                  Última medición: {timeAgo(lastBP.fecha)}
                </span>
              </div>

              {bpHistory.length >= 2 && (
                <div className="mt-3">
                  <SparklineBP values={bpHistory} />
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center py-4 gap-2">
              <Camera size={28} className="text-[#5B6B7C]" />
              <p className="text-sm text-[#5B6B7C]">Sin mediciones aún</p>
              <Link
                href="/paciente/registrar"
                className="text-xs text-[#0E9594] font-semibold underline underline-offset-2"
              >
                Registrar presión →
              </Link>
            </div>
          )}
        </div>

        {/* 3. CTA PRIMARIO */}
        <div className="mx-4">
          {registroHoy ? (
            <Link
              href="/paciente/historial"
              className="flex items-center justify-center gap-2 bg-[#E6F4F4] text-[#16A571] font-bold text-base rounded-[20px] py-4 w-full"
            >
              <CheckCircle2 size={20} />
              Registro de hoy completo
            </Link>
          ) : (
            <div>
              <Link
                href="/paciente/registrar"
                className="flex items-center justify-center gap-3 bg-[#0E9594] text-white font-bold text-xl rounded-[20px] py-5 w-full shadow-md active:scale-95 transition-transform"
              >
                <ClipboardList size={24} />
                Registrar cómo me siento
              </Link>
              <p className="text-center text-xs text-[#5B6B7C] mt-2">Solo toma 2 minutos</p>
            </div>
          )}
        </div>

        {/* 4. MEDICACIÓN DE HOY */}
        {medicamentos.length > 0 && (
          <div className="mx-4 bg-white rounded-[20px] border-2 border-[#E8A317] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Pill size={20} className="text-[#E8A317]" />
              <h2 className="font-bold text-[#0E1B2A] text-base">Medicación de hoy</h2>
            </div>

            <ul className="flex flex-col gap-3 mb-4">
              {medicamentos.map((med) => (
                <li key={med.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#0E1B2A]">{med.nombre}</p>
                    <p className="text-xs text-[#5B6B7C]">{med.dosis}</p>
                  </div>
                  {registroHoy?.tomo_medicamento === true && (
                    <span className="flex items-center gap-1 text-xs font-semibold bg-green-50 text-[#16A571] px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={13} /> Tomado ✓
                    </span>
                  )}
                  {registroHoy?.tomo_medicamento === false && (
                    <span className="flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-600 px-2.5 py-1 rounded-full">
                      <XCircle size={13} /> No tomado
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {!registroHoy && (
              <Link
                href="/paciente/registrar"
                className="block w-full text-center bg-[#16A571] text-white font-bold text-sm rounded-[16px] py-3 active:scale-95 transition-transform"
              >
                Marcar como tomado ✓
              </Link>
            )}
          </div>
        )}

        {/* 5. KORA CHAT */}
        <Link
          href="/paciente/chat"
          className="mx-4 flex items-center gap-4 p-5 rounded-[20px] text-white active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(to right, #0E9594, #0b7a79)' }}
        >
          <MessageCircle size={24} className="shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-base leading-tight">Pregúntale a KORA</p>
            <p className="text-white/80 text-sm mt-0.5">Tu asistente de salud personal</p>
          </div>
          <span className="text-white/80 text-sm font-semibold whitespace-nowrap">
            Ir al chat →
          </span>
        </Link>

        {/* 6. ACCIONES SECUNDARIAS */}
        <div className="mx-4 grid grid-cols-2 gap-3">
          <Link
            href="/paciente/receta"
            className="bg-white rounded-[20px] p-4 border border-[#E5EAF0] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="bg-[#0B2A4A] rounded-2xl p-3">
              <Camera size={22} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-[#0E1B2A] text-center">Foto de receta</span>
          </Link>

          <Link
            href="/paciente/documentos"
            className="bg-white rounded-[20px] p-4 border border-[#E5EAF0] shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-transform"
          >
            <div className="bg-[#0E9594] rounded-2xl p-3">
              <FolderOpen size={22} className="text-white" />
            </div>
            <span className="text-xs font-semibold text-[#0E1B2A] text-center">Mis documentos</span>
          </Link>
        </div>
      </main>

      {/* BOTTOM NAV */}
      <BottomNav active="/paciente/dashboard" />
    </div>
  )
}

function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5EAF0] flex justify-around items-center h-20 px-2 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {NAV.map(({ href, label, Icon }) => {
        const isActive = active === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 min-w-[48px] py-1 rounded-xl transition-colors ${
              isActive ? 'text-[#0E9594]' : 'text-gray-400'
            }`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
