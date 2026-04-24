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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Registro {
  id: string
  created_at: string
  bienestar_general: number | null
  tomo_medicamento: boolean | null
  presion_sistolica: number | null
  presion_diastolica: number | null
  dolor_cabeza: number | null
  mareos: boolean
  hinchazon: boolean
  notas: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMOJIS: Record<number, string> = { 1: '😔', 2: '😕', 3: '😐', 4: '🙂', 5: '😊' }

function formatFecha(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
}

function formatFechaCorta(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

// ─── Nav inferior ─────────────────────────────────────────────────────────────

const NAV = [
  { href: '/paciente/dashboard', label: 'Inicio', Icon: Home },
  { href: '/paciente/registrar', label: 'Registrar', Icon: ClipboardList },
  { href: '/paciente/historial', label: 'Historial', Icon: FileText },
  { href: '/paciente/documentos', label: 'Docs', Icon: FileText },
  { href: '/paciente/perfil', label: 'Perfil', Icon: User },
]

// ─── Componente principal ─────────────────────────────────────────────────────

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

      const { data } = await supabase
        .from('registros')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', hace30dias.toISOString())
        .order('created_at', { ascending: false })

      setRegistros(data ?? [])
      setLoading(false)
    }
    cargar()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faff]">
        <div className="w-10 h-10 rounded-full border-4 border-[#1a56a4] border-t-transparent animate-spin" />
      </div>
    )
  }

  // Datos para el gráfico (orden cronológico)
  const datosGrafico = [...registros]
    .filter(r => r.presion_sistolica !== null)
    .reverse()
    .map(r => ({
      fecha: formatFechaCorta(r.created_at),
      sistolica: r.presion_sistolica,
      diastolica: r.presion_diastolica,
    }))

  return (
    <div className="min-h-screen bg-[#f8faff] pb-28">

      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Mi historial</h1>
        <p className="text-base text-gray-400">Últimos 30 días</p>
      </header>

      <main className="px-4 pt-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Sin registros */}
        {registros.length === 0 && (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-xl font-bold text-gray-700 mb-2">
              Aún no tienes registros
            </p>
            <p className="text-base text-gray-400 mb-6">
              ¡Empieza hoy y tu médico podrá ver cómo estás!
            </p>
            <Link
              href="/paciente/registrar"
              className="inline-block bg-[#1a56a4] text-white text-lg font-bold px-8 py-3 rounded-2xl"
            >
              Registrar ahora
            </Link>
          </div>
        )}

        {/* Gráfico de presión */}
        {datosGrafico.length > 1 && (
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="text-[#1a56a4]" size={22} />
              <h2 className="text-xl font-bold text-gray-800">Presión arterial</h2>
            </div>
            <div className="flex gap-4 mb-3">
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <span className="w-3 h-3 rounded-full bg-[#1a56a4] inline-block" />
                Sistólica
              </span>
              <span className="flex items-center gap-1.5 text-sm text-gray-500">
                <span className="w-3 h-3 rounded-full bg-[#93c5fd] inline-block" />
                Diastólica
              </span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={datosGrafico} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    fontSize: '14px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sistolica"
                  stroke="#1a56a4"
                  strokeWidth={2.5}
                  dot={{ fill: '#1a56a4', r: 4 }}
                  name="Sistólica"
                />
                <Line
                  type="monotone"
                  dataKey="diastolica"
                  stroke="#93c5fd"
                  strokeWidth={2.5}
                  dot={{ fill: '#93c5fd', r: 4 }}
                  name="Diastólica"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Lista de registros */}
        {registros.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-gray-600 px-1">Registros</h2>
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

// ─── Card de un registro ──────────────────────────────────────────────────────

function CardRegistro({ registro: r }: { registro: Registro }) {
  const [expandido, setExpandido] = useState(false)

  return (
    <button
      onClick={() => setExpandido(!expandido)}
      className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left w-full active:scale-[0.99] transition-transform"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{EMOJIS[r.bienestar_general ?? 3] ?? '😐'}</span>
          <div>
            <p className="text-base font-bold text-gray-800">{formatFecha(r.created_at)}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {r.tomo_medicamento === true && (
                <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                  <CheckCircle2 size={13} /> Med. tomado
                </span>
              )}
              {r.tomo_medicamento === false && (
                <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                  <XCircle size={13} /> Med. no tomado
                </span>
              )}
            </div>
          </div>
        </div>
        {r.presion_sistolica && (
          <div className="text-right">
            <p className="text-lg font-bold text-[#1a56a4]">
              {r.presion_sistolica}/{r.presion_diastolica}
            </p>
            <p className="text-xs text-gray-400">mmHg</p>
          </div>
        )}
      </div>

      {/* Detalles expandibles */}
      {expandido && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1.5">
          {r.dolor_cabeza !== null && r.dolor_cabeza > 0 && (
            <p className="text-sm text-gray-500">🤕 Dolor de cabeza: nivel {r.dolor_cabeza}</p>
          )}
          {r.mareos && <p className="text-sm text-gray-500">🌀 Mareos</p>}
          {r.hinchazon && <p className="text-sm text-gray-500">🫧 Hinchazón</p>}
          {r.pulso && <p className="text-sm text-gray-500">💓 Pulso: {r.pulso} bpm</p>}
          {r.notas && (
            <p className="text-sm text-gray-500 mt-1 bg-gray-50 rounded-xl p-3">
              📝 {r.notas}
            </p>
          )}
        </div>
      )}
    </button>
  )
}

// ─── Nav inferior ─────────────────────────────────────────────────────────────

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