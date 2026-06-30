'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Shield, Users, Stethoscope, Activity, LogOut, RefreshCw } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Fila {
  medico_id: string
  medico: string
  especialidad: string | null
  medico_demo: boolean
  paciente_id: string
  paciente: string
  paciente_demo: boolean
  registros: number
  ultimo_registro: string | null
  dias_sin_registrar: number | null
  adherencia_pct: number | null
  sys: number | null
  dia: number | null
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'sin-datos'
}

const SEM = {
  verde: { dot: '#16A571', label: 'En control', bg: '#E8F7F0' },
  amarillo: { dot: '#E8A317', label: 'Atención', bg: '#FBF3E2' },
  rojo: { dot: '#E0533D', label: 'Riesgo', bg: '#FBE9E6' },
  'sin-datos': { dot: '#5B6B7C', label: 'Sin datos', bg: '#EEF2F7' },
} as const

function fmtFecha(f: string | null) {
  if (!f) return '—'
  const [y, m, d] = f.split('-')
  return `${d}/${m}/${y.slice(2)}`
}

export default function AdminPanel() {
  const router = useRouter()
  const supabase = createClient()
  const [filas, setFilas] = useState<Fila[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function cargar() {
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/overview')
    if (res.status === 401) { router.push('/login'); return }
    if (res.status === 403) { setError('Tu cuenta no tiene acceso de administrador.'); setLoading(false); return }
    if (!res.ok) { setError('No se pudo cargar el panel.'); setLoading(false); return }
    const data = await res.json()
    setFilas(data.pacientes ?? [])
    setLoading(false)
  }

  useEffect(() => { cargar() /* eslint-disable-next-line */ }, [])

  const medicos = useMemo(() => {
    const map = new Map<string, { nombre: string; especialidad: string | null; demo: boolean; pacientes: Fila[] }>()
    for (const f of filas) {
      if (!map.has(f.medico_id)) map.set(f.medico_id, { nombre: f.medico, especialidad: f.especialidad, demo: f.medico_demo, pacientes: [] })
      map.get(f.medico_id)!.pacientes.push(f)
    }
    return Array.from(map.values()).sort((a, b) => Number(a.demo) - Number(b.demo) || a.nombre.localeCompare(b.nombre))
  }, [filas])

  const kpi = useMemo(() => {
    const total = filas.length
    const cuenta = (s: string) => filas.filter(f => f.semaforo === s).length
    const adh = filas.map(f => f.adherencia_pct).filter((n): n is number => typeof n === 'number')
    const adhMedia = adh.length ? Math.round(adh.reduce((a, b) => a + b, 0) / adh.length) : 0
    return { medicos: medicos.length, total, rojo: cuenta('rojo'), amarillo: cuenta('amarillo'), verde: cuenta('verde'), adhMedia }
  }, [filas, medicos])

  async function salir() { await supabase.auth.signOut(); router.push('/login') }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F7FB' }}>
        <RefreshCw className="animate-spin" style={{ color: '#0E9594' }} size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center" style={{ background: '#F4F7FB' }}>
        <Shield style={{ color: '#E0533D' }} size={40} />
        <p className="text-lg font-semibold" style={{ color: '#0E1B2A' }}>{error}</p>
        <button onClick={salir} className="text-sm underline" style={{ color: '#0E9594' }}>Cerrar sesión</button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-16" style={{ background: '#F4F7FB' }}>
      <header className="px-5 pt-12 pb-6" style={{ background: 'linear-gradient(135deg,#0B2A4A,#123A63)' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-2" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <Shield className="text-white" size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white leading-tight">Panel general</h1>
              <p className="text-sm" style={{ color: '#9DB4CE' }}>Vista de administrador · KORA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cargar} className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.12)' }} title="Actualizar">
              <RefreshCw className="text-white" size={18} />
            </button>
            <button onClick={salir} className="rounded-xl p-2" style={{ background: 'rgba(255,255,255,0.12)' }} title="Salir">
              <LogOut className="text-white" size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 -mt-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <KpiCard icon={<Stethoscope size={18} />} valor={kpi.medicos} label="Médicos" color="#0E9594" />
          <KpiCard icon={<Users size={18} />} valor={kpi.total} label="Pacientes" color="#0B2A4A" />
          <KpiCard icon={<Activity size={18} />} valor={`${kpi.adhMedia}%`} label="Adherencia media" color="#16A571" />
          <KpiCard valor={kpi.rojo} label="En riesgo" color="#E0533D" dot />
          <KpiCard valor={kpi.amarillo} label="Atención" color="#E8A317" dot />
        </div>

        {/* Tabla por médico */}
        {medicos.map(m => (
          <section key={m.nombre} className="mb-6 rounded-3xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 1px 2px rgba(11,42,74,.04),0 8px 24px rgba(11,42,74,.06)' }}>
            <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: '#E5EAF0' }}>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold" style={{ color: '#0E1B2A' }}>{m.nombre}</h2>
                  {m.demo && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FBF3E2', color: '#9a6a08' }}>demo</span>}
                </div>
                <p className="text-sm" style={{ color: '#5B6B7C' }}>{m.especialidad ?? 'Sin especialidad'} · {m.pacientes.length} paciente{m.pacientes.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: '#5B6B7C' }} className="text-left">
                    <th className="px-5 py-2 font-semibold">Paciente</th>
                    <th className="px-3 py-2 font-semibold">Estado</th>
                    <th className="px-3 py-2 font-semibold">Última P.A.</th>
                    <th className="px-3 py-2 font-semibold">Adherencia</th>
                    <th className="px-3 py-2 font-semibold">Últ. registro</th>
                    <th className="px-3 py-2 font-semibold">Sin reg.</th>
                    <th className="px-5 py-2 font-semibold">Regs.</th>
                  </tr>
                </thead>
                <tbody>
                  {[...m.pacientes].sort((a, b) => (a.adherencia_pct ?? -1) - (b.adherencia_pct ?? -1)).map(p => {
                    const s = SEM[p.semaforo]
                    const paHigh = (p.sys ?? 0) >= 140 || (p.dia ?? 0) >= 90
                    return (
                      <tr key={p.paciente_id} className="border-t" style={{ borderColor: '#EEF2F7' }}>
                        <td className="px-5 py-2.5 font-medium" style={{ color: '#0E1B2A' }}>{p.paciente}</td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: s.bg, color: s.dot }}>
                            <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.dot }} />{s.label}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: paHigh ? '#E0533D' : '#0E1B2A' }}>
                          {p.sys && p.dia ? `${p.sys}/${p.dia}` : '—'}
                        </td>
                        <td className="px-3 py-2.5 font-semibold" style={{ color: (p.adherencia_pct ?? 0) < 50 ? '#E0533D' : (p.adherencia_pct ?? 0) < 70 ? '#E8A317' : '#16A571' }}>
                          {p.adherencia_pct != null ? `${p.adherencia_pct}%` : '—'}
                        </td>
                        <td className="px-3 py-2.5" style={{ color: '#5B6B7C' }}>{fmtFecha(p.ultimo_registro)}</td>
                        <td className="px-3 py-2.5" style={{ color: (p.dias_sin_registrar ?? 0) > 5 ? '#E0533D' : '#5B6B7C' }}>
                          {p.dias_sin_registrar != null ? `${p.dias_sin_registrar}d` : '—'}
                        </td>
                        <td className="px-5 py-2.5" style={{ color: '#5B6B7C' }}>{p.registros}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </main>
    </div>
  )
}

function KpiCard({ icon, valor, label, color, dot }: { icon?: React.ReactNode; valor: React.ReactNode; label: string; color: string; dot?: boolean }) {
  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: '#fff', boxShadow: '0 1px 2px rgba(11,42,74,.04),0 8px 24px rgba(11,42,74,.06)' }}>
      <div className="flex items-center gap-1.5 mb-1" style={{ color }}>
        {dot ? <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: color }} /> : icon}
        <span className="text-2xl font-extrabold">{valor}</span>
      </div>
      <p className="text-xs font-medium" style={{ color: '#5B6B7C' }}>{label}</p>
    </div>
  )
}
