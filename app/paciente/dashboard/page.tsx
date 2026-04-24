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
  Sun,
  Moon,
  Sunset,
  Plus,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSaludo() {
  const h = new Date().getHours()
  if (h < 12) return { texto: 'Buenos días', Icono: Sun }
  if (h < 18) return { texto: 'Buenas tardes', Icono: Sunset }
  return { texto: 'Buenas noches', Icono: Moon }
}

const EMOJIS: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' }
const BIENESTAR_LABEL: Record<number, string> = { 1: 'Muy mal', 2: 'Mal', 3: 'Regular', 4: 'Bien', 5: 'Muy bien' }

function hoyISO() {
  return new Date().toISOString().split('T')[0]
}

// ─── Navegación inferior ──────────────────────────────────────────────────────

const NAV = [
  { href: '/paciente/dashboard', label: 'Inicio', Icon: Home },
  { href: '/paciente/registrar', label: 'Registrar', Icon: ClipboardList },
  { href: '/paciente/historial', label: 'Historial', Icon: FileText },
  { href: '/paciente/documentos', label: 'Docs', Icon: FileText },
  { href: '/paciente/perfil', label: 'Perfil', Icon: User },
]

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PacienteDashboard() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [registroHoy, setRegistroHoy] = useState<Registro | null>(null)
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [loading, setLoading] = useState(true)

  const { texto: saludo, Icono: IconoSaludo } = getSaludo()

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Perfil
      const { data: perfil } = await supabase
        .from('profiles')
        .select('nombre, email')
        .eq('paciente_id', user.id)
        .single()

      setProfile(perfil)

      // Registro de hoy
      const { data: reg } = await supabase
        .from('registros')
        .select('id, created_at, bienestar_general, tomo_medicamento')
        .eq('paciente_id', user.id)
        .gte('created_at', `${hoyISO()}T00:00:00`)
        .lte('created_at', `${hoyISO()}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      setRegistroHoy(reg ?? null)

      // Medicamentos activos
      const { data: meds } = await supabase
        .from('medicamentos')
        .select('id, nombre, dosis, frecuencia_horas, activo')
        .eq('user_id', user.id)
        .eq('activo', true)

      setMedicamentos(meds ?? [])
      setLoading(false)
    }

    cargar()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faff]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#1a56a4] border-t-transparent animate-spin" />
          <p className="text-[#1a56a4] text-lg font-medium">Cargando…</p>
        </div>
      </div>
    )
  }

  const primerNombre = profile?.nombre?.split(' ')[0] ?? 'Paciente'

  return (
    <div className="min-h-screen bg-[#f8faff] pb-28">

      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#e8f0fc] rounded-full p-2">
            <IconoSaludo className="text-[#1a56a4]" size={26} />
          </div>
          <div>
            <p className="text-base text-gray-400 leading-tight">{saludo}</p>
            <h1 className="text-2xl font-bold text-gray-800 leading-tight">
              {primerNombre} 👋
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 pt-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Card principal */}
        {registroHoy ? (
          <RegistroExistente registro={registroHoy} />
        ) : (
          <CardRegistrar />
        )}

        {/* Medicamentos */}
        {medicamentos.length > 0 && (
          <CardMedicamentos medicamentos={medicamentos} registroHoy={registroHoy} />
        )}

        {/* Mensaje motivacional */}
        {medicamentos.length === 0 && registroHoy && (
          <div className="bg-[#e8f0fc] rounded-2xl p-5 text-center">
            <p className="text-2xl mb-1">🌟</p>
            <p className="text-[#1a56a4] font-semibold text-lg">¡Llevas un buen registro!</p>
            <p className="text-gray-500 text-base mt-1">Tu médico podrá ver cómo te has sentido.</p>
          </div>
        )}

      </main>

      {/* FAB */}
      <Link
        href="/paciente/registrar"
        className="fixed bottom-24 right-5 bg-[#1a56a4] text-white rounded-full w-16 h-16 flex items-center justify-center shadow-xl active:scale-95 transition-transform z-50"
        aria-label="Nuevo registro"
      >
        <Plus size={32} />
      </Link>

      {/* Nav inferior */}
      <BottomNav active="/paciente/dashboard" />
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function CardRegistrar() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <p className="text-xl font-semibold text-gray-700 leading-snug mb-1">
        ¿Ya registraste cómo te sientes hoy?
      </p>
      <p className="text-base text-gray-400 mb-5">
        Solo toma 2 minutos. Tu médico lo agradecerá 💙
      </p>
      <Link
        href="/paciente/registrar"
        className="block w-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-95 transition-all text-white text-xl font-bold py-4 rounded-2xl text-center shadow-md"
      >
        Registrar ahora
      </Link>
    </div>
  )
}

function RegistroExistente({ registro }: { registro: Registro }) {
  const bienestar = registro.bienestar_general
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-4xl">{EMOJIS[bienestar] ?? '😐'}</span>
        <div>
          <p className="text-base text-gray-400">Tu registro de hoy</p>
          <p className="text-xl font-bold text-gray-800">
            {BIENESTAR_LABEL[bienestar] ?? 'Registrado'} ✓
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {registro.tomo_medicamento === true && (
          <span className="flex items-center gap-1 bg-green-50 text-green-700 text-sm font-medium px-3 py-1 rounded-full">
            <CheckCircle2 size={15} /> Medicamento tomado
          </span>
        )}
        {registro.tomo_medicamento === false && (
          <span className="flex items-center gap-1 bg-red-50 text-red-600 text-sm font-medium px-3 py-1 rounded-full">
            <XCircle size={15} /> Medicamento no tomado
          </span>
        )}
      </div>
      <Link
        href="/paciente/historial"
        className="block mt-4 text-center text-[#1a56a4] font-semibold text-base underline underline-offset-2"
      >
        Ver historial completo →
      </Link>
    </div>
  )
}

function CardMedicamentos({
  medicamentos,
  registroHoy,
}: {
  medicamentos: Medicamento[]
  registroHoy: Registro | null
}) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4">
        <Pill className="text-[#1a56a4]" size={22} />
        <h2 className="text-xl font-bold text-gray-800">Medicamentos de hoy</h2>
      </div>
      <ul className="flex flex-col gap-3">
        {medicamentos.map((med) => {
          const tomado = registroHoy?.tomo_medicamento === true
          return (
            <li key={med.id} className="flex items-center justify-between bg-[#f8faff] rounded-2xl px-4 py-3">
              <div>
                <p className="text-lg font-semibold text-gray-800">{med.nombre}</p>
                <p className="text-sm text-gray-400">{med.dosis}</p>
              </div>
              {tomado ? (
                <CheckCircle2 className="text-green-500 shrink-0" size={28} />
              ) : (
                <div className="w-7 h-7 rounded-full border-2 border-gray-300 shrink-0" />
              )}
            </li>
          )
        })}
      </ul>
      {!registroHoy && (
        <Link
          href="/paciente/registrar"
          className="block mt-4 text-center bg-[#1a56a4] text-white font-bold text-lg py-3 rounded-2xl active:scale-95 transition-transform"
        >
          Confirmar que los tomé
        </Link>
      )}
    </div>
  )
}

function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-20 px-2 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {NAV.map(({ href, label, Icon }) => {
        const isActive = active === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 min-w-[56px] py-1 rounded-xl transition-colors ${isActive ? 'text-[#1a56a4]' : 'text-gray-400'}`}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}