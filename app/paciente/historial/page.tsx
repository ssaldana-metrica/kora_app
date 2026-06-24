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
  TrendingUp,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ClipboardX,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

export const dynamic = 'force-dynamic'

interface Registro {
  id: string
  fecha: string           // columna date
  created_at: string
  bienestar_general: number | null
  tomo_medicamento: boolean | null
  presion_sistolica: number | null
  presion_diastolica: number | null
  pulso: number | null
  dolor_cabeza: number | null
  mareos: boolean
  hinchazon: boolean
  notas: string | null
}

const EMOJIS: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' }

function formatFecha(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatFechaCorta(iso: string) {
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

const NAV = [
  { href: '/paciente/dashboard', label: 'Inicio', Icon: Home },
  { href: '/paciente/registrar', label: 'Registrar', Icon: ClipboardList },
  { href: '/paciente/chat', label: 'Chat', Icon: MessageCircle },
  { href: '/paciente/historial', label: 'Historial', Icon: FileText },
  { href: '/paciente/perfil', label: 'Perfil', Icon: User },
]

export default function Historial() {
  const supabase = createClient()
  const router = useRouter()
  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const hace30dias = new Date()
      hace30dias.setDate(hace30dias.getDate() - 30)
      const hace30ISO = hace30dias.toISOString().split('T')[0]

      const { data } = await supabase
        .from('registros')
        .select('*')
        .eq('paciente_id', user.id)
        .gte('fecha', hace30ISO)
        .order('fecha', { ascending: false })

      setRegistros(data ?? [])
      setLoading(false)
    }
    cargar()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#0E9594] border-t-transparent animate-spin" />
          <p className="text-[#0E9594] text-base font-medium">Cargando historial…</p>
        </div>
      </div>
    )
  }

  const datosGrafico = [...registros]
    .filter(r => r.presion_sistolica !== null)
    .reverse()
    .map(r => ({
      fecha: formatFechaCorta(r.fecha),
      sistolica: r.presion_sistolica,
      diastolica: r.presion_diastolica,
    }))

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-28">

      {/* HEADER */}
      <header className="bg-white px-5 pt-12 pb-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#0E1B2A]">Mi historial</h1>
        <p className="text-sm text-[#5B6B7C] mt-0.5">Últimos 30 días</p>
      </header>

      <main className="px-4 pt-5 flex flex-col gap-4 max-w-lg mx-auto">

        {/* EMPTY STATE */}
        {registros.length === 0 && (
          <div className="bg-white rounded-[20px] border border-[#E5EAF0] shadow-sm p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-[#E6F4F4] rounded-full p-4">
                <ClipboardX size={32} className="text-[#0E9594]" />
              </div>
            </div>
            <p className="text-lg font-bold text-[#0E1B2A] mb-1">Aún no tienes registros</p>
            <p className="text-sm text-[#5B6B7C] mb-6">
              ¡Empieza hoy y tu médico podrá ver cómo estás evolucionando!
            </p>
            <Link
              href="/paciente/registrar"
              className="inline-block bg-[#0E9594] text-white text-sm font-bold px-8 py-3 rounded-[16px] active:scale-95 transition-transform"
            >
              Registrar ahora
            </Link>
          </div>
        )}

        {/* GRÁFICO PRESIÓN ARTERIAL */}
        {datosGrafico.length > 1 && (
          <div className="bg-white rounded-[20px] border border-[#E5EAF0] shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-[#0E9594]" />
              <h2 className="text-base font-bold text-[#0E1B2A]">Presión arterial</h2>
            </div>
            <div className="flex gap-4 mb-3">
              <span className="flex items-center gap-1.5 text-xs text-[#5B6B7C]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0E9594] inline-block" />
                Sistólica
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[#5B6B7C]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7DCFCF] inline-block" />
                Diastólica
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={datosGrafico} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 10, fill: '#5B6B7C' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#5B6B7C' }}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #E5EAF0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                    fontSize: '13px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sistolica"
                  stroke="#0E9594"
                  strokeWidth={2.5}
                  dot={{ fill: '#0E9594', r: 4 }}
                  name="Sistólica"
                />
                <Line
                  type="monotone"
                  dataKey="diastolica"
                  stroke="#7DCFCF"
                  strokeWidth={2.5}
                  dot={{ fill: '#7DCFCF', r: 4 }}
                  name="Diastólica"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* LISTA DE REGISTROS */}
        {registros.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-xs font-bold text-[#5B6B7C] uppercase tracking-widest px-1">
              Registros
            </h2>
            {registros.map((reg) => (
              <CardRegistro key={reg.id} registro={reg} />
            ))}
          </div>
        )}

      </main>

      <BottomNav active="/paciente/historial" />
    </div>
  )
}

function CardRegistro({ registro: r }: { registro: Registro }) {
  const [expandido, setExpandido] = useState(false)

  const sintomas: string[] = []
  if (r.dolor_cabeza !== null && r.dolor_cabeza > 0) sintomas.push(`Dolor cabeza · ${r.dolor_cabeza}/5`)
  if (r.mareos) sintomas.push('Mareos')
  if (r.hinchazon) sintomas.push('Hinchazón')

  return (
    <button
      onClick={() => setExpandido(!expandido)}
      className="bg-white rounded-[20px] border border-[#E5EAF0] shadow-sm p-4 text-left w-full active:scale-[0.99] transition-transform"
    >
      {/* TOP ROW */}
      <div className="flex items-start justify-between gap-3">

        {/* LEFT: emoji + fecha + medicamento */}
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none mt-0.5">
            {EMOJIS[r.bienestar_general ?? 3] ?? '😐'}
          </span>
          <div>
            {/* Date badge */}
            <span className="inline-block bg-[#E6F4F4] text-[#0E9594] text-xs font-bold px-3 py-1 rounded-full capitalize">
              {formatFecha(r.fecha)}
            </span>

            {/* Medication badge */}
            <div className="mt-2">
              {r.tomo_medicamento === true && (
                <span className="inline-flex items-center gap-1 bg-[#16A571]/10 text-[#16A571] text-xs font-semibold px-2.5 py-1 rounded-full">
                  <CheckCircle2 size={11} strokeWidth={2.5} />
                  Med. tomado
                </span>
              )}
              {r.tomo_medicamento === false && (
                <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <XCircle size={11} strokeWidth={2.5} />
                  Med. no tomado
                </span>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: presión + chevron */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          {r.presion_sistolica !== null ? (
            <div className="text-right">
              <p className="text-2xl font-bold text-[#0E1B2A] leading-none">
                {r.presion_sistolica}/{r.presion_diastolica}
              </p>
              <p className="text-sm text-[#5B6B7C] mt-0.5">mmHg</p>
            </div>
          ) : (
            <span className="text-xs text-[#5B6B7C]">Sin presión</span>
          )}
          <span className="text-[#5B6B7C]">
            {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>

      </div>

      {/* SÍNTOMAS TAGS (always visible if any) */}
      {sintomas.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {sintomas.map((s) => (
            <span
              key={s}
              className="bg-[#E5EAF0] text-[#5B6B7C] text-xs font-medium px-2.5 py-0.5 rounded-full"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* EXPANDED DETAILS */}
      {expandido && (
        <div className="mt-3 pt-3 border-t border-[#E5EAF0] flex flex-col gap-2">
          {r.pulso !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#5B6B7C] w-24">Pulso</span>
              <span className="text-sm font-bold text-[#0E1B2A]">{r.pulso} bpm</span>
            </div>
          )}
          {r.bienestar_general !== null && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#5B6B7C] w-24">Bienestar</span>
              <span className="text-sm font-bold text-[#0E1B2A]">
                {EMOJIS[r.bienestar_general]} {r.bienestar_general}/5
              </span>
            </div>
          )}
          {r.notas && (
            <div className="mt-1 bg-[#F4F7FB] rounded-[12px] p-3">
              <p className="text-xs font-semibold text-[#5B6B7C] mb-1">Notas</p>
              <p className="text-sm text-[#0E1B2A]">{r.notas}</p>
            </div>
          )}
        </div>
      )}
    </button>
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
