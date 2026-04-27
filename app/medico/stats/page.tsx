'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  ClipboardList,
  Pill,
  TrendingUp,
  RefreshCw,
  Loader2,
} from 'lucide-react'

interface Stats {
  totalPacientes: number
  registraronEstaSemana: number
  adherenciaPromedio: number
  totalRegistros30d: number
}

function StatCard({
  icono: Icono,
  color,
  valor,
  label,
  sub,
}: {
  icono: React.ElementType
  color: string
  valor: string | number
  label: string
  sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icono size={20} />
      </div>
      <p className="text-3xl font-bold text-gray-900">{valor}</p>
      <p className="text-sm font-medium text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function MedicoStatsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [medicoNombre, setMedicoNombre] = useState('')

  useEffect(() => {
    cargarStats()
  }, [])

  async function cargarStats() {
    setLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Médico profile
      const { data: medico } = await supabase
        .from('profiles')
        .select('nombre, role')
        .eq('id', user.id)
        .single()

      if (!medico || medico.role !== 'medico') {
        router.push('/login')
        return
      }

      setMedicoNombre(medico.nombre ?? '')

      // Patients linked to this doctor
      const { data: pacientes } = await supabase
        .from('profiles')
        .select('id')
        .eq('medico_id', user.id)
        .eq('role', 'paciente')

      const totalPacientes = pacientes?.length ?? 0
      const pacienteIds = pacientes?.map((p) => p.id) ?? []

      if (pacienteIds.length === 0) {
        setStats({ totalPacientes: 0, registraronEstaSemana: 0, adherenciaPromedio: 0, totalRegistros30d: 0 })
        setLoading(false)
        return
      }

      // Date ranges
      const ahora = new Date()
      const hace7 = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Registros last 30 days
      const { data: registros30 } = await supabase
        .from('registros')
        .select('paciente_id, fecha, tomo_medicamento')
        .in('paciente_id', pacienteIds)
        .gte('fecha', hace30)

      const totalRegistros30d = registros30?.length ?? 0

      // Patients who registered this week
      const idsEstaSemanaa = new Set(
        (registros30 ?? [])
          .filter((r) => r.fecha >= hace7)
          .map((r) => r.paciente_id)
      )
      const registraronEstaSemana = idsEstaSemanaa.size

      // Adherencia promedio
      let adherenciaPromedio = 0
      if (totalRegistros30d > 0) {
        const tomados = (registros30 ?? []).filter((r) => r.tomo_medicamento).length
        adherenciaPromedio = Math.round((tomados / totalRegistros30d) * 100)
      }

      setStats({
        totalPacientes,
        registraronEstaSemana,
        adherenciaPromedio,
        totalRegistros30d,
      })
    } catch (err) {
      console.error('Error cargando stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const apellido = medicoNombre.split(' ').slice(-1)[0] ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0d3d7a] text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link
            href="/medico/dashboard"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <p className="text-blue-200 text-xs">KORA · Estadísticas</p>
            <h1 className="font-bold text-lg leading-tight">Dr. {apellido}</h1>
          </div>
          <button
            onClick={cargarStats}
            className="ml-auto p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {loading ? (
          <div className="text-center py-16">
            <Loader2 size={32} className="animate-spin text-[#0d3d7a] mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Calculando estadísticas...</p>
          </div>
        ) : stats ? (
          <>
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Resumen de tu grupo
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  icono={Users}
                  color="bg-blue-50 text-[#0d3d7a]"
                  valor={stats.totalPacientes}
                  label="Pacientes vinculados"
                />
                <StatCard
                  icono={ClipboardList}
                  color="bg-emerald-50 text-emerald-600"
                  valor={stats.registraronEstaSemana}
                  label="Registraron esta semana"
                  sub={`de ${stats.totalPacientes} pacientes`}
                />
                <StatCard
                  icono={Pill}
                  color={
                    stats.adherenciaPromedio >= 80
                      ? 'bg-emerald-50 text-emerald-600'
                      : stats.adherenciaPromedio >= 50
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-red-50 text-red-600'
                  }
                  valor={`${stats.adherenciaPromedio}%`}
                  label="Adherencia promedio"
                  sub="Últimos 30 días"
                />
                <StatCard
                  icono={TrendingUp}
                  color="bg-purple-50 text-purple-600"
                  valor={stats.totalRegistros30d}
                  label="Registros totales"
                  sub="Últimos 30 días"
                />
              </div>
            </div>

            {/* Interpretation */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-3">Interpretación</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {stats.totalPacientes === 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold mt-0.5">!</span>
                    Aún no tienes pacientes vinculados. Comparte tu código para que se registren.
                  </li>
                )}
                {stats.totalPacientes > 0 && stats.registraronEstaSemana < stats.totalPacientes && (
                  <li className="flex items-start gap-2">
                    <span className="text-amber-500 font-bold mt-0.5">!</span>
                    {stats.totalPacientes - stats.registraronEstaSemana} paciente(s) no registraron esta semana. Considera recordarles.
                  </li>
                )}
                {stats.adherenciaPromedio >= 80 && (
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                    Excelente adherencia al medicamento. Tus pacientes están siendo constantes.
                  </li>
                )}
                {stats.adherenciaPromedio > 0 && stats.adherenciaPromedio < 80 && (
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 font-bold mt-0.5">!</span>
                    La adherencia está por debajo del 80%. Revisa qué pacientes no están tomando su medicamento.
                  </li>
                )}
                {stats.totalRegistros30d > 0 && (
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold mt-0.5">i</span>
                    Promedio de {(stats.totalRegistros30d / Math.max(stats.totalPacientes, 1)).toFixed(1)} registros por paciente en los últimos 30 días.
                  </li>
                )}
              </ul>
            </div>

            <Link
              href="/medico/dashboard"
              className="block w-full text-center bg-[#0d3d7a] text-white font-semibold py-3 rounded-xl hover:bg-[#0b3268] transition-colors"
            >
              Ver detalle de pacientes
            </Link>
          </>
        ) : (
          <p className="text-center text-gray-500 py-10">Error cargando estadísticas.</p>
        )}
      </main>
    </div>
  )
}