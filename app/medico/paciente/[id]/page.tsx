'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Brain, BarChart2, List, FileText,
  Loader2, Pill, TrendingUp, ExternalLink, Activity,
  Sparkles, Send,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend,
  ReferenceArea,
} from 'recharts'
import ExportarPDF from '@/components/medico/ExportarPDF'
import DemoBadge from '@/components/DemoBadge'

export const dynamic = 'force-dynamic'

// ── Tipos ──────────────────────────────────────────────────────────────────

interface Registro {
  id: string
  fecha: string
  presion_sistolica: number | null
  presion_diastolica: number | null
  pulso: number | null
  dolor_cabeza: number | null
  mareos: boolean
  hinchazon: boolean
  tomo_medicamento: boolean
  hora_medicamento: string | null
  bienestar_general: number
  notas: string | null
}

interface Documento {
  id: string
  tipo: string
  nombre_archivo: string
  url: string
  fecha_documento: string | null
  procesado_ia: boolean
  created_at: string
}

interface PacienteInfo {
  id: string
  nombre: string
  enfermedad?: string
  fecha_nacimiento?: string
  email?: string
  es_demo?: boolean
}

type Tab = 'resumen' | 'graficos' | 'registros' | 'documentos'

type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'sin-datos'

// ── Helpers ────────────────────────────────────────────────────────────────

function calcularAdherencia(registros: Registro[]): number {
  if (!registros.length) return 0
  const tomados = registros.filter(r => r.tomo_medicamento).length
  return Math.round((tomados / registros.length) * 100)
}

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })
}

function calcularEdad(fechaNac: string): number {
  return Math.floor(
    (new Date().getTime() - new Date(fechaNac).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  )
}

function calcularSemaforo(registros: Registro[]): Semaforo {
  if (!registros.length) return 'sin-datos'
  const ultimo = registros[0]
  const sistolica = ultimo.presion_sistolica ?? 0
  if (sistolica >= 140) return 'rojo'
  if (sistolica >= 130) return 'amarillo'
  return 'verde'
}

// ── Semaforo Badge ─────────────────────────────────────────────────────────

function SemaforoBadge({ semaforo }: { semaforo: Semaforo }) {
  const config = {
    verde:      { label: 'Bien',      bg: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30' },
    amarillo:   { label: 'Atención',  bg: 'bg-amber-500/20 text-amber-100 border-amber-400/30' },
    rojo:       { label: 'Alerta',    bg: 'bg-red-500/20 text-red-100 border-red-400/30' },
    'sin-datos':{ label: 'Sin datos', bg: 'bg-white/10 text-white/70 border-white/20' },
  }
  const { label, bg } = config[semaforo]
  const dot = {
    verde: 'bg-emerald-400',
    amarillo: 'bg-amber-400',
    rojo: 'bg-red-400',
    'sin-datos': 'bg-white/40',
  }[semaforo]

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

// ── TAB: RESUMEN IA ────────────────────────────────────────────────────────

function TabResumen({
  paciente, registros, documentos, medicoNombre, codigoMedico,
}: {
  paciente: PacienteInfo
  registros: Registro[]
  documentos: Documento[]
  medicoNombre: string
  codigoMedico: string
}) {
  const [resumen, setResumen] = useState('')
  const [cargandoResumen, setCargandoResumen] = useState(false)
  const [mensajes, setMensajes] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [input, setInput] = useState('')
  const [cargandoAgente, setCargandoAgente] = useState(false)

  const sugeridas = [
    '¿Qué es lo más importante para la cita de hoy?',
    '¿Cuándo tuvo la presión más alta?',
    '¿Está cumpliendo el tratamiento?',
    '¿Hay alguna alerta que deba revisar?',
  ]

  useEffect(() => {
    generarResumen()
  }, [])

  async function generarResumen(forzar = false) {
    setCargandoResumen(true)
    setResumen('')
    try {
      const res = await fetch('/api/resumenes/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteNombre: paciente.nombre,
          registros,
          documentos,
          pacienteId: paciente.id,
          forzar,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResumen(data.error || 'No se pudo generar el resumen. Intenta nuevamente.')
        return
      }
      setResumen(data.resumen || 'No se pudo generar el resumen.')
    } catch {
      setResumen('Error de conexión al generar el resumen. Intenta nuevamente.')
    } finally {
      setCargandoResumen(false)
    }
  }

  async function enviar(texto?: string) {
    const msg = texto || input.trim()
    if (!msg) return
    setInput('')
    const nuevos = [...mensajes, { role: 'user' as const, content: msg }]
    setMensajes(nuevos)
    setCargandoAgente(true)
    try {
      const res = await fetch('/api/agente-medico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pacienteNombre: paciente.nombre, registros, documentos, historial: nuevos }),
      })
      const data = await res.json()
      setMensajes([...nuevos, { role: 'assistant', content: data.respuesta || 'Sin respuesta.' }])
    } catch {
      setMensajes([...nuevos, { role: 'assistant', content: 'Error al conectar con KORA.' }])
    } finally {
      setCargandoAgente(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* AI Summary card */}
      <div className="bg-white rounded-[20px] border border-[#E5EAF0] shadow p-5 mb-4">
        <h2 className="text-base font-bold text-[#0E1B2A] mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-[#0E9594]" />
          Resumen pre-consulta
        </h2>

        {cargandoResumen && (
          <div className="bg-[#E6F4F4] border border-[#0E9594]/20 rounded-[16px] p-4 animate-pulse space-y-3">
            <div className="h-4 bg-[#0E9594]/20 rounded w-3/4" />
            <div className="h-4 bg-[#0E9594]/20 rounded w-full" />
            <div className="h-4 bg-[#0E9594]/20 rounded w-5/6" />
            <div className="h-4 bg-[#0E9594]/20 rounded w-2/3" />
            <div className="h-4 bg-[#0E9594]/20 rounded w-full" />
          </div>
        )}

        {resumen && !cargandoResumen && (
          <div className="bg-[#E6F4F4] border border-[#0E9594]/20 rounded-[16px] p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-1.5">
                <Brain size={15} className="text-[#0E9594] flex-shrink-0" />
                <span className="text-xs font-semibold text-[#0E9594]">
                  KORA · {new Date().toLocaleDateString('es-PE')}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => generarResumen(true)}
                  className="text-[#0E9594] text-sm underline hover:text-[#0B7B7A] transition-colors"
                >
                  Regenerar
                </button>
                <ExportarPDF
                  pacienteNombre={paciente.nombre}
                  pacienteEnfermedad={paciente.enfermedad}
                  medicoNombre={medicoNombre}
                  codigoMedico={codigoMedico}
                  registros={registros}
                  resumenIA={resumen}
                />
              </div>
            </div>
            <p className="text-sm text-[#0E1B2A] leading-relaxed whitespace-pre-wrap">
              {resumen}
            </p>
            <p className="text-xs text-[#5B6B7C] italic mt-3">
              Generado por IA · El médico valida
            </p>
          </div>
        )}

        {!cargandoResumen && !resumen && (
          <div className="bg-[#E6F4F4] border border-[#0E9594]/20 rounded-[16px] p-4 text-center">
            <p className="text-sm text-[#5B6B7C]">No se pudo cargar el resumen.</p>
            <button
              onClick={() => generarResumen()}
              className="mt-2 text-[#0E9594] text-sm underline"
            >
              Intentar de nuevo
            </button>
          </div>
        )}
      </div>

      {/* Agente KORA */}
      <div className="bg-white rounded-[20px] border border-[#E5EAF0] shadow p-5 mb-4">
        <h2 className="text-base font-bold text-[#0E1B2A] mb-1 flex items-center gap-2">
          <Brain size={16} className="text-[#0E9594]" />
          Agente KORA
        </h2>
        <p className="text-xs text-[#5B6B7C] mb-3">
          Pregúntale cualquier cosa sobre {paciente.nombre}
        </p>

        {mensajes.length > 0 && (
          <div className="space-y-3 max-h-80 overflow-y-auto mb-3 px-1">
            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-[14px] text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-[#0B2A4A] text-white'
                    : 'bg-[#F4F7FB] text-[#0E1B2A] border border-[#E5EAF0]'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {cargandoAgente && (
              <div className="flex justify-start">
                <div className="bg-[#F4F7FB] border border-[#E5EAF0] px-4 py-2.5 rounded-[14px]">
                  <Loader2 size={14} className="animate-spin text-[#0E9594]" />
                </div>
              </div>
            )}
          </div>
        )}

        {mensajes.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {sugeridas.map(p => (
              <button
                key={p}
                onClick={() => enviar(p)}
                className="text-xs bg-[#E6F4F4] text-[#0E9594] border border-[#0E9594]/20 px-3 py-1.5 rounded-full hover:bg-[#d0eded] transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-3 border-t border-[#E5EAF0]">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviar()}
            placeholder="Pregúntale a KORA sobre este paciente..."
            className="flex-1 text-sm border border-[#E5EAF0] rounded-[12px] px-3 py-2.5 bg-[#F4F7FB] text-[#0E1B2A] placeholder:text-[#9BAAB7] focus:outline-none focus:ring-2 focus:ring-[#0E9594]/30"
            disabled={cargandoAgente}
          />
          <button
            onClick={() => enviar()}
            disabled={cargandoAgente || !input.trim()}
            className="bg-[#0B2A4A] text-white px-3.5 py-2.5 rounded-[12px] hover:bg-[#0d3260] disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            <Send size={15} />
          </button>
        </div>
      </div>

      {/* PDF Export standalone button */}
      <div className="flex justify-end">
        <ExportarPDF
          pacienteNombre={paciente.nombre}
          pacienteEnfermedad={paciente.enfermedad}
          medicoNombre={medicoNombre}
          codigoMedico={codigoMedico}
          registros={registros}
          resumenIA={resumen}
        />
      </div>
    </div>
  )
}

// ── TAB: GRÁFICOS ──────────────────────────────────────────────────────────

function TabGraficos({ registros }: { registros: Registro[] }) {
  const datosPresion = registros.filter(r => r.presion_sistolica).slice().reverse().map(r => ({
    fecha: formatFecha(r.fecha),
    sistolica: r.presion_sistolica,
    diastolica: r.presion_diastolica,
  }))

  const semanas: { semana: string; pct: number }[] = []
  const ordenados = [...registros].reverse()
  for (let i = 0; i < ordenados.length; i += 7) {
    const s = ordenados.slice(i, i + 7)
    const tomados = s.filter(r => r.tomo_medicamento).length
    semanas.push({ semana: `Sem ${Math.floor(i / 7) + 1}`, pct: Math.round((tomados / s.length) * 100) })
  }

  const datosBienestar = registros.slice().reverse().map(r => ({
    fecha: formatFecha(r.fecha), bienestar: r.bienestar_general,
  }))

  if (!registros.length) return (
    <div className="bg-white rounded-[20px] border border-[#E5EAF0] shadow p-5 mb-4">
      <div className="text-center py-12 text-[#5B6B7C]">
        <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
        <p>No hay registros para mostrar gráficos.</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Presion arterial */}
      <div className="bg-white rounded-[20px] border border-[#E5EAF0] shadow p-5 mb-4">
        <h2 className="text-base font-bold text-[#0E1B2A] mb-1 flex items-center gap-2">
          <Activity size={16} className="text-[#0E9594]" />
          Presion arterial (ultimos 30 dias)
        </h2>
        <p className="text-xs text-[#5B6B7C] mb-4">mmHg · linea punteada = limite normal</p>
        {datosPresion.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={datosPresion}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#5B6B7C' }} />
              <YAxis domain={[60, 180]} tick={{ fontSize: 11, fill: '#5B6B7C' }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #E5EAF0', fontSize: 12 }}
              />
              <ReferenceArea y1={60} y2={130} fill="rgba(22,165,113,0.07)" />
              <ReferenceLine y={130} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '130', fontSize: 10, fill: '#f59e0b' }} />
              <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '85', fontSize: 10, fill: '#f59e0b' }} />
              <Line type="monotone" dataKey="sistolica" stroke="#0E9594" strokeWidth={2.5} dot={{ r: 3, fill: '#0E9594', strokeWidth: 0 }} name="Sistolica" />
              <Line type="monotone" dataKey="diastolica" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3, fill: '#60a5fa', strokeWidth: 0 }} name="Diastolica" />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-[#5B6B7C] text-sm text-center py-6">No hay datos de presion registrados.</p>
        )}
      </div>

      {/* Adherencia */}
      <div className="bg-white rounded-[20px] border border-[#E5EAF0] shadow p-5 mb-4">
        <h2 className="text-base font-bold text-[#0E1B2A] mb-1 flex items-center gap-2">
          <Pill size={16} className="text-[#0E9594]" />
          Adherencia al medicamento por semana
        </h2>
        <p className="text-xs text-[#5B6B7C] mb-4">% de dias que tomo el medicamento</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={semanas}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
            <XAxis dataKey="semana" tick={{ fontSize: 11, fill: '#5B6B7C' }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#5B6B7C' }} unit="%" />
            <Tooltip
              formatter={(v) => [`${v}%`, 'Adherencia']}
              contentStyle={{ borderRadius: 12, border: '1px solid #E5EAF0', fontSize: 12 }}
            />
            <ReferenceLine y={80} stroke="#16a571" strokeDasharray="4 4" />
            <Bar dataKey="pct" fill="#0E9594" radius={[6, 6, 0, 0]} name="Adherencia %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bienestar */}
      <div className="bg-white rounded-[20px] border border-[#E5EAF0] shadow p-5 mb-4">
        <h2 className="text-base font-bold text-[#0E1B2A] mb-1 flex items-center gap-2">
          <TrendingUp size={16} className="text-[#0E9594]" />
          Bienestar general (escala 1-5)
        </h2>
        <p className="text-xs text-[#5B6B7C] mb-4">1 = muy mal · 5 = excelente</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={datosBienestar}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5EAF0" />
            <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#5B6B7C' }} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11, fill: '#5B6B7C' }} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #E5EAF0', fontSize: 12 }} />
            <ReferenceArea y1={3.5} y2={5} fill="rgba(22,165,113,0.1)" />
            <Line type="monotone" dataKey="bienestar" stroke="#0E9594" strokeWidth={2.5} dot={{ r: 3, fill: '#0E9594', strokeWidth: 0 }} name="Bienestar" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── TAB: REGISTROS ─────────────────────────────────────────────────────────

function TabRegistros({ registros }: { registros: Registro[] }) {
  if (!registros.length) return (
    <div className="bg-white rounded-[20px] border border-[#E5EAF0] shadow p-5 mb-4">
      <div className="text-center py-12 text-[#5B6B7C]">
        <List size={40} className="mx-auto mb-3 opacity-30" />
        <p>Este paciente aun no tiene registros.</p>
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-[20px] border border-[#E5EAF0] shadow p-5 mb-4">
      <h2 className="text-base font-bold text-[#0E1B2A] mb-3 flex items-center gap-2">
        <List size={16} className="text-[#0E9594]" />
        Historial de registros
      </h2>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E5EAF0]">
              {['Fecha', 'Presion', 'Medicamento', 'Sintomas', 'Bienestar', 'Notas'].map(h => (
                <th key={h} className="text-left px-3 py-2.5 font-semibold text-[#5B6B7C] text-xs uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {registros.map((r, i) => {
              const sintomas = [
                r.dolor_cabeza && r.dolor_cabeza > 0 ? `Dolor cabeza (${r.dolor_cabeza}/5)` : null,
                r.mareos ? 'Mareos' : null,
                r.hinchazon ? 'Hinchazon' : null,
              ].filter(Boolean)
              return (
                <tr
                  key={r.id}
                  className={`border-b border-[#E5EAF0] last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F4F7FB]'}`}
                >
                  <td className="px-3 py-3 font-medium text-[#0E1B2A] whitespace-nowrap">
                    {new Date(r.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {r.presion_sistolica ? (
                      <span className={`font-semibold ${r.presion_sistolica >= 140 ? 'text-red-600' : r.presion_sistolica >= 130 ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {r.presion_sistolica}/{r.presion_diastolica}
                      </span>
                    ) : <span className="text-[#9BAAB7]">-</span>}
                  </td>
                  <td className="px-3 py-3">
                    {r.tomo_medicamento
                      ? <span className="text-emerald-600 font-medium">Si</span>
                      : <span className="text-red-500 font-medium">No</span>
                    }
                  </td>
                  <td className="px-3 py-3 text-[#5B6B7C] text-xs">
                    {sintomas.length ? sintomas.join(' · ') : <span className="text-[#9BAAB7]">Ninguno</span>}
                  </td>
                  <td className="px-3 py-3">
                    <span className="text-lg">{['😞','😕','😐','🙂','😄'][r.bienestar_general - 1] ?? '-'}</span>
                  </td>
                  <td className="px-3 py-3 text-[#5B6B7C] text-xs max-w-[160px] truncate">
                    {r.notas || <span className="text-[#9BAAB7]">-</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── TAB: DOCUMENTOS ────────────────────────────────────────────────────────

function TabDocumentos({ documentos }: { documentos: Documento[] }) {
  const iconTipo: Record<string, string> = { receta: '💊', examen: '🔬', resultado: '📋', otro: '📎' }

  if (!documentos.length) return (
    <div className="bg-white rounded-[20px] border border-[#E5EAF0] shadow p-5 mb-4">
      <div className="text-center py-12 text-[#5B6B7C]">
        <FileText size={40} className="mx-auto mb-3 opacity-30" />
        <p>Este paciente aun no ha subido documentos.</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-[20px] border border-[#E5EAF0] shadow p-5 mb-4">
        <h2 className="text-base font-bold text-[#0E1B2A] mb-3 flex items-center gap-2">
          <FileText size={16} className="text-[#0E9594]" />
          Documentos del paciente
        </h2>
        <div className="space-y-2">
          {documentos.map(doc => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-4 bg-[#F4F7FB] rounded-[14px] p-3.5 border border-[#E5EAF0] hover:border-[#0E9594]/30 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0">{iconTipo[doc.tipo] ?? '📎'}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-[#0E1B2A] text-sm truncate">{doc.nombre_archivo}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-[#5B6B7C] capitalize">{doc.tipo}</span>
                    {doc.fecha_documento && (
                      <span className="text-xs text-[#5B6B7C]">
                        {new Date(doc.fecha_documento).toLocaleDateString('es-PE')}
                      </span>
                    )}
                    {doc.procesado_ia && (
                      <span className="text-xs bg-[#E6F4F4] text-[#0E9594] px-2 py-0.5 rounded-full font-medium border border-[#0E9594]/20">
                        Procesado por IA
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#0E9594] hover:underline flex-shrink-0 font-medium"
              >
                <ExternalLink size={13} /> Ver
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── PÁGINA PRINCIPAL ───────────────────────────────────────────────────────

export default function DetallePaciente() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const pacienteId = params.id as string

  const [paciente, setPaciente] = useState<PacienteInfo | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [medicoNombre, setMedicoNombre] = useState('')
  const [codigoMedico, setCodigoMedico] = useState('')
  const [loading, setLoading] = useState(true)
  const [tabActivo, setTabActivo] = useState<Tab>('resumen')

  useEffect(() => { cargarDatos() }, [pacienteId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: medico } = await supabase.from('profiles').select('nombre, codigo_medico').eq('id', user.id).single()
      if (medico) { setMedicoNombre(medico.nombre); setCodigoMedico(medico.codigo_medico ?? '') }

      const { data: perfil } = await supabase.from('profiles').select('id, nombre, enfermedad, fecha_nacimiento, email, es_demo').eq('id', pacienteId).single()
      if (!perfil) { router.push('/medico/dashboard'); return }
      setPaciente(perfil)

      const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const { data: regs } = await supabase.from('registros').select('*').eq('paciente_id', pacienteId).gte('fecha', hace30).order('fecha', { ascending: false })
      setRegistros(regs ?? [])

      const { data: docs } = await supabase.from('documentos').select('*').eq('paciente_id', pacienteId).order('created_at', { ascending: false })
      setDocumentos(docs ?? [])

    } catch (err) {
      console.error('Error cargando paciente:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-[#0E9594]" />
    </div>
  )

  if (!paciente) return null

  const adherencia = calcularAdherencia(registros)
  const edadPaciente = paciente.fecha_nacimiento ? calcularEdad(paciente.fecha_nacimiento) : null
  const semaforo = calcularSemaforo(registros)

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'resumen',    label: 'Resumen IA',  icon: <Brain size={15} /> },
    { key: 'graficos',   label: 'Graficos',    icon: <BarChart2 size={15} /> },
    { key: 'registros',  label: 'Registros',   icon: <List size={15} /> },
    { key: 'documentos', label: 'Documentos',  icon: <FileText size={15} /> },
  ]

  const ultimoRegistroFecha = registros[0]?.fecha
  const ultimaActualizacion = ultimoRegistroFecha
    ? (() => {
        const diff = Date.now() - new Date(ultimoRegistroFecha).getTime()
        const h = diff / (1000 * 60 * 60)
        if (h < 1) return 'hace menos de 1 hora'
        if (h < 24) return `hace ${Math.floor(h)} hora${Math.floor(h) > 1 ? 's' : ''}`
        const d = Math.floor(h / 24)
        return `hace ${d} dia${d > 1 ? 's' : ''}`
      })()
    : null

  return (
    <div className="min-h-screen bg-[#F4F7FB]">

      {/* ── Header: navy gradient ───────────────────────────────────────── */}
      <header
        className="text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #0B2A4A 0%, #0d3d7a 60%, #0E4F8B 100%)' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-start gap-4">
            <Link
              href="/medico/dashboard"
              className="mt-1 p-2 rounded-[10px] bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-bold text-xl leading-tight text-white">{paciente.nombre}</h1>
                <SemaforoBadge semaforo={semaforo} />
                {paciente.es_demo && <DemoBadge />}
              </div>
              <div className="flex items-center gap-2 text-blue-200 text-sm mt-1 flex-wrap">
                {edadPaciente && <span>{edadPaciente} anos</span>}
                {paciente.enfermedad && <><span>·</span><span>{paciente.enfermedad}</span></>}
                <span>·</span><span>{registros.length} registros (30d)</span>
              </div>
              {ultimaActualizacion && (
                <p className="text-blue-300/80 text-xs mt-0.5">
                  Ultimo registro: {ultimaActualizacion}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats strip inside header */}
        <div className="border-t border-white/10">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-xl font-bold text-white">{registros.length}</p>
                <p className="text-xs text-blue-200/70 mt-0.5">Registros (30d)</p>
              </div>
              <div className="text-center">
                <p className={`text-xl font-bold ${adherencia >= 80 ? 'text-emerald-300' : adherencia >= 50 ? 'text-amber-300' : 'text-red-300'}`}>
                  {adherencia}%
                </p>
                <p className="text-xs text-blue-200/70 mt-0.5">Adherencia</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-white">{documentos.length}</p>
                <p className="text-xs text-blue-200/70 mt-0.5">Documentos</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-[#E5EAF0] sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setTabActivo(tab.key)}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                  tabActivo === tab.key
                    ? 'border-[#0E9594] text-[#0E9594]'
                    : 'border-transparent text-[#5B6B7C] hover:text-[#0E1B2A]'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {tabActivo === 'resumen' && (
          <TabResumen
            paciente={paciente}
            registros={registros}
            documentos={documentos}
            medicoNombre={medicoNombre}
            codigoMedico={codigoMedico}
          />
        )}
        {tabActivo === 'graficos'   && <TabGraficos registros={registros} />}
        {tabActivo === 'registros'  && <TabRegistros registros={registros} />}
        {tabActivo === 'documentos' && <TabDocumentos documentos={documentos} />}
      </main>
    </div>
  )
}
