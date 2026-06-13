'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Flame, Pill, Heart, Sparkles } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea,
} from 'recharts'
import { calcularRacha, calcularAdherencia, mensajeHito } from '@/lib/progreso'

interface Registro {
  fecha: string
  tomo_medicamento: boolean | null
  presion_sistolica: number | null
  presion_diastolica: number | null
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

export default function Progreso() {
  const supabase = createClient()
  const router = useRouter()

  const [registros, setRegistros] = useState<Registro[]>([])
  const [loading, setLoading] = useState(true)
  const [mensajeIA, setMensajeIA] = useState('')
  const [cargandoIA, setCargandoIA] = useState(true)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data } = await supabase
        .from('registros')
        .select('fecha, tomo_medicamento, presion_sistolica, presion_diastolica')
        .eq('paciente_id', user.id)
        .gte('fecha', hace30)
        .order('fecha', { ascending: false })

      setRegistros(data ?? [])
      setLoading(false)

      try {
        const res = await fetch('/api/paciente/mi-progreso')
        const json = await res.json()
        setMensajeIA(json.mensaje ?? '')
      } catch {
        setMensajeIA('')
      } finally {
        setCargandoIA(false)
      }
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

  const racha = calcularRacha(registros)
  const adherencia = calcularAdherencia(registros)
  const hito = mensajeHito(racha)

  const datosPresion = registros
    .filter(r => r.presion_sistolica)
    .slice()
    .reverse()
    .map(r => ({
      fecha: formatFecha(r.fecha),
      sistolica: r.presion_sistolica,
      diastolica: r.presion_diastolica,
    }))

  return (
    <div className="min-h-screen bg-[#f8faff] pb-12">
      <header className="bg-white px-5 pt-12 pb-6 shadow-sm flex items-center gap-3">
        <Link href="/paciente/dashboard" className="p-2 -ml-2 rounded-lg text-[#1a56a4]">
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mi progreso</h1>
          <p className="text-base text-gray-400">Cómo vas en los últimos 30 días</p>
        </div>
      </header>

      <main className="px-4 pt-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Racha */}
        <div className="bg-gradient-to-br from-[#ff8a3d] to-[#ff5e3a] rounded-3xl p-6 text-white shadow-md">
          <div className="flex items-center gap-3">
            <Flame size={40} className="shrink-0" />
            <div>
              <p className="text-4xl font-extrabold leading-none">{racha}</p>
              <p className="text-lg font-semibold mt-1">
                {racha === 1 ? 'día cuidándote' : 'días seguidos cuidándote'}
              </p>
            </div>
          </div>
          {hito && <p className="mt-4 text-white/95 text-base font-medium">{hito}</p>}
          {racha === 0 && (
            <p className="mt-4 text-white/95 text-base">
              Registra hoy para empezar tu racha. ¡Cada día cuenta!
            </p>
          )}
        </div>

        {/* Adherencia */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Pill className="text-[#1a56a4]" size={22} />
            <h2 className="text-xl font-bold text-gray-800">Tu adherencia</h2>
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-5xl font-extrabold ${adherencia >= 80 ? 'text-emerald-600' : adherencia >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {adherencia}%
            </span>
            <span className="text-gray-400 text-base mb-2">de tus días tomaste tu medicamento</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 mt-4 overflow-hidden">
            <div
              className={`h-3 rounded-full ${adherencia >= 80 ? 'bg-emerald-500' : adherencia >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${adherencia}%` }}
            />
          </div>
        </div>

        {/* Mensaje amable de IA */}
        <div className="bg-[#e8f0fc] rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-[#1a56a4]" size={20} />
            <h2 className="text-lg font-bold text-[#1a56a4]">Tu evolución</h2>
          </div>
          {cargandoIA ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-4 bg-white/70 rounded w-5/6" />
              <div className="h-4 bg-white/70 rounded w-3/4" />
            </div>
          ) : (
            <p className="text-gray-700 text-base leading-relaxed">
              {mensajeIA || 'Sigue registrando para ver cómo evolucionas.'}
            </p>
          )}
        </div>

        {/* Gráfico de presión con zona saludable */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="text-[#1a56a4]" size={20} />
            <h2 className="text-lg font-bold text-gray-800">Tu presión</h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">La zona verde es el rango saludable</p>
          {datosPresion.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={datosPresion}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                <YAxis domain={[60, 180]} tick={{ fontSize: 11 }} />
                <Tooltip />
                {/* Zona saludable de presión sistólica (90–130) */}
                <ReferenceArea y1={90} y2={130} fill="#22c55e" fillOpacity={0.12} />
                <Line type="monotone" dataKey="sistolica" stroke="#1a56a4" strokeWidth={2.5} dot={{ r: 3 }} name="Sistólica" />
                <Line type="monotone" dataKey="diastolica" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3 }} name="Diastólica" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-base text-center py-8">
              Aún no has registrado tu presión. Cuando lo hagas, verás aquí tu evolución.
            </p>
          )}
        </div>

        <Link
          href="/paciente/registrar"
          className="block w-full bg-[#22c55e] hover:bg-[#16a34a] active:scale-95 transition-all text-white text-xl font-bold py-4 rounded-2xl text-center shadow-md"
        >
          Registrar de hoy
        </Link>
      </main>
    </div>
  )
}
