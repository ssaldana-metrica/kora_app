'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

import {
  ArrowLeft,
  Brain,
  BarChart2,
  List,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Pill,
  TrendingUp,
  Calendar,
  Download,
  ExternalLink,
  Activity,
} from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  Legend,
} from 'recharts'

import ExportarPDF from '@/components/medico/ExportarPDF'

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
  medicamento_tomado: boolean
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
}

type Tab = 'resumen' | 'graficos' | 'registros' | 'documentos'

// ── Helpers ────────────────────────────────────────────────────────────────

function calcularAdherencia(registros: Registro[]): number {
  if (!registros.length) return 0
  const tomados = registros.filter(r => r.medicamento_tomado).length
  return Math.round((tomados / registros.length) * 100)
}

function formatFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
  })
}

function edad(fechaNac: string): number {
  return Math.floor(
    (new Date().getTime() - new Date(fechaNac).getTime()) /
      (1000 * 60 * 60 * 24 * 365.25)
  )
}

// ── Sub-componentes de tabs ────────────────────────────────────────────────

// TAB: RESUMEN IA
function TabResumen({
  paciente,
  registros,
  documentos,
}: {
  paciente: PacienteInfo
  registros: Registro[]
  documentos: Documento[]
}) {
  const [resumen, setResumen] = useState('')
  const [cargandoResumen, setCargandoResumen] = useState(false)
  const [mensajesAgente, setMensajesAgente] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([])
  const [inputAgente, setInputAgente] = useState('')
  const [cargandoAgente, setCargandoAgente] = useState(false)

  const preguntasSugeridas = [
    '¿Qué es lo más importante para la cita de hoy?',
    '¿Cuándo tuvo la presión más alta?',
    '¿Está cumpliendo el tratamiento?',
    '¿Hay alguna alerta que deba revisar?',
  ]

  async function generarResumen() {
    setCargandoResumen(true)
    setResumen('')
    try {
      const res = await fetch('/api/resumen-paciente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: paciente.id,
          pacienteNombre: paciente.nombre,
          registros,
          documentos,
        }),
      })
      const data = await res.json()
      setResumen(data.resumen || 'No se pudo generar el resumen.')
    } catch {
      setResumen('Error al generar el resumen. Intenta nuevamente.')
    } finally {
      setCargandoResumen(false)
    }
  }

  async function enviarMensaje(texto?: string) {
    const mensaje = texto || inputAgente.trim()
    if (!mensaje) return
    setInputAgente('')

    const nuevosMensajes = [
      ...mensajesAgente,
      { role: 'user' as const, content: mensaje },
    ]
    setMensajesAgente(nuevosMensajes)
    setCargandoAgente(true)

    try {
      const res = await fetch('/api/agente-medico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pacienteId: paciente.id,
          pacienteNombre: paciente.nombre,
          registros,
          documentos,
          historial: nuevosMensajes,
        }),
      })
      const data = await res.json()
      setMensajesAgente([
        ...nuevosMensajes,
        { role: 'assistant', content: data.respuesta || 'Sin respuesta.' },
      ])
    } catch {
      setMensajesAgente([
        ...nuevosMensajes,
        { role: 'assistant', content: 'Error al conectar con KORA. Intenta nuevamente.' },
      ])
    } finally {
      setCargandoAgente(false)
    }
  }

  const adherencia = calcularAdherencia(registros)

  return (
    <div className="space-y-6">

      {/* Botón generar resumen */}
      {!resumen && !cargandoResumen && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-8 text-center">
          <div className="w-14 h-14 bg-[#0d3d7a] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Brain size={26} className="text-white" />
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">
            Resumen pre-consulta con IA
          </h3>
          <p className="text-gray-500 text-sm mb-5 max-w-sm mx-auto">
            Analiza los últimos 30 días de {paciente.nombre} y genera un resumen
            clínico listo para revisar antes de la consulta.
          </p>
          <button
            onClick={generarResumen}
            className="bg-[#0d3d7a] text-white px-6 py-3 rounded-xl font-semibold hover:bg-[#0b3268] transition-colors shadow-sm"
          >
            Generar resumen pre-consulta
          </button>
        </div>
      )}

      {/* Cargando resumen */}
      {cargandoResumen && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Loader2 size={32} className="animate-spin text-[#0d3d7a] mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Analizando datos del paciente...</p>
        </div>
      )}

      {/* Resumen generado */}
      {resumen && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-[#0d3d7a] px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <Brain size={16} />
              <span className="font-semibold text-sm">Resumen KORA · {new Date().toLocaleDateString('es-PE')}</span>
            </div>
            <button
              onClick={generarResumen}
              className="text-blue-200 hover:text-white text-xs underline"
            >
              Regenerar
            </button>
          </div>
          <div className="p-5">
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
              {resumen}
            </div>
          </div>
        </div>
      )}

      {/* Agente IA */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Brain size={16} className="text-[#0d3d7a]" />
            Agente KORA
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Pregúntale cualquier cosa sobre {paciente.nombre}
          </p>
        </div>

        {/* Historial de mensajes */}
        {mensajesAgente.length > 0 && (
          <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto">
            {mensajesAgente.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#0d3d7a] text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {cargandoAgente && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2.5 rounded-xl">
                  <Loader2 size={14} className="animate-spin text-gray-400" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chips sugeridos */}
        {mensajesAgente.length === 0 && (
          <div className="px-4 py-3 flex flex-wrap gap-2">
            {preguntasSugeridas.map(p => (
              <button
                key={p}
                onClick={() => enviarMensaje(p)}
                className="text-xs bg-blue-50 text-[#0d3d7a] border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex gap-2">
          <input
            value={inputAgente}
            onChange={e => setInputAgente(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensaje()}
            placeholder="Pregúntale a KORA sobre este paciente..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
            disabled={cargandoAgente}
          />
          <button
            onClick={() => enviarMensaje()}
            disabled={cargandoAgente || !inputAgente.trim()}
            className="bg-[#0d3d7a] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#0b3268] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Enviar
          </button>
        </div>
      </div>

    </div>
  )
}

// TAB: GRÁFICOS
function TabGraficos({ registros }: { registros: Registro[] }) {
  // Datos para gráfico de presión
  const datosPresion = registros
    .filter(r => r.presion_sistolica)
    .slice()
    .reverse()
    .map(r => ({
      fecha: formatFecha(r.fecha),
      sistolica: r.presion_sistolica,
      diastolica: r.presion_diastolica,
    }))

  // Datos para gráfico de adherencia por semana
  const semanas: { semana: string; pct: number }[] = []
  const registrosOrdenados = [...registros].reverse()
  for (let i = 0; i < registrosOrdenados.length; i += 7) {
    const semana = registrosOrdenados.slice(i, i + 7)
    const tomados = semana.filter(r => r.medicamento_tomado).length
    semanas.push({
      semana: `Sem ${Math.floor(i / 7) + 1}`,
      pct: Math.round((tomados / semana.length) * 100),
    })
  }

  // Datos para bienestar
  const datosBienestar = registros
    .slice()
    .reverse()
    .map(r => ({
      fecha: formatFecha(r.fecha),
      bienestar: r.bienestar_general,
    }))

  if (!registros.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
        <p>No hay registros para mostrar gráficos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Gráfico presión */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Activity size={16} className="text-[#0d3d7a]" />
          Presión arterial (últimos 30 días)
        </h3>
        <p className="text-xs text-gray-400 mb-4">mmHg · línea punteada = límite normal</p>
        {datosPresion.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={datosPresion}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
              <YAxis domain={[60, 180]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <ReferenceLine y={130} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '130', fontSize: 10 }} />
              <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '85', fontSize: 10 }} />
              <Line
                type="monotone"
                dataKey="sistolica"
                stroke="#0d3d7a"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Sistólica"
              />
              <Line
                type="monotone"
                dataKey="diastolica"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Diastólica"
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-sm text-center py-6">No hay datos de presión registrados.</p>
        )}
      </div>

      {/* Gráfico adherencia */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Pill size={16} className="text-[#0d3d7a]" />
          Adherencia al medicamento por semana
        </h3>
        <p className="text-xs text-gray-400 mb-4">% de días que tomó el medicamento</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={semanas}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <Tooltip formatter={(v) => [`${v}%`, 'Adherencia']} />
            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" />
            <Bar dataKey="pct" fill="#0d3d7a" radius={[4, 4, 0, 0]} name="Adherencia %" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico bienestar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <TrendingUp size={16} className="text-[#0d3d7a]" />
          Bienestar general (escala 1–5)
        </h3>
        <p className="text-xs text-gray-400 mb-4">1 = muy mal · 5 = excelente</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={datosBienestar}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="bienestar"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Bienestar"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}

// TAB: REGISTROS
function TabRegistros({ registros }: { registros: Registro[] }) {
  if (!registros.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <List size={40} className="mx-auto mb-3 opacity-30" />
        <p>Este paciente aún no tiene registros.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Fecha</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Presión</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Medicamento</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Síntomas</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Bienestar</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 text-xs uppercase tracking-wide">Notas</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r, i) => {
              const sintomas = [
                r.dolor_cabeza && r.dolor_cabeza > 0 ? `Dolor cabeza (${r.dolor_cabeza}/5)` : null,
                r.mareos ? 'Mareos' : null,
                r.hinchazon ? 'Hinchazón' : null,
              ].filter(Boolean)

              return (
                <tr key={r.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                    {new Date(r.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.presion_sistolica ? (
                      <span className={`font-semibold ${
                        r.presion_sistolica >= 140 ? 'text-red-600' :
                        r.presion_sistolica >= 130 ? 'text-amber-600' :
                        'text-emerald-700'
                      }`}>
                        {r.presion_sistolica}/{r.presion_diastolica}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.medicamento_tomado
                      ? <span className="text-emerald-600 font-medium">✓ Sí</span>
                      : <span className="text-red-500 font-medium">✗ No</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">
                    {sintomas.length ? sintomas.join(' · ') : <span className="text-gray-300">Ninguno</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-lg">
                      {['😞','😕','😐','🙂','😄'][r.bienestar_general - 1] ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">
                    {r.notas || <span className="text-gray-300">—</span>}
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

// TAB: DOCUMENTOS
function TabDocumentos({ documentos }: { documentos: Documento[] }) {
  const iconTipo: Record<string, string> = {
    receta: '💊',
    examen: '🔬',
    resultado: '📋',
    otro: '📎',
  }

  if (!documentos.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <FileText size={40} className="mx-auto mb-3 opacity-30" />
        <p>Este paciente aún no ha subido documentos.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {documentos.map(doc => (
        <div
          key={doc.id}
          className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{iconTipo[doc.tipo] ?? '📎'}</span>
            <div>
              <p className="font-medium text-gray-900 text-sm">{doc.nombre_archivo}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400 capitalize">{doc.tipo}</span>
                {doc.fecha_documento && (
                  <>
                    <span className="text-gray-200">·</span>
                    <span className="text-xs text-gray-400">
                      {new Date(doc.fecha_documento).toLocaleDateString('es-PE')}
                    </span>
                  </>
                )}
                {doc.procesado_ia && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                    ✓ Procesado por IA
                  </span>
                )}
              </div>
            </div>
          </div>
          <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[#0d3d7a] hover:underline flex-shrink-0"
          >
            <ExternalLink size={13} />
            Ver
          </a>
        </div>
      ))}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────

export default function DetallePaciente() {
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const pacienteId = params.id as string

  const [paciente, setPaciente] = useState<PacienteInfo | null>(null)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [tabActivo, setTabActivo] = useState<Tab>('resumen')

  useEffect(() => {
    cargarDatos()
  }, [pacienteId])

  async function cargarDatos() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Datos del paciente
      const { data: perfil } = await supabase
        .from('profiles')
        .select('id, nombre, enfermedad, fecha_nacimiento, email')
        .eq('id', pacienteId)
        .single()

      if (!perfil) { router.push('/medico/dashboard'); return }
      setPaciente(perfil)

      // Registros últimos 30 días
      const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]

      const { data: regs } = await supabase
        .from('registros')
        .select('*')
        .eq('paciente_id', pacienteId)
        .gte('fecha', hace30)
        .order('fecha', { ascending: false })

      setRegistros(regs ?? [])

      // Documentos
      const { data: docs } = await supabase
        .from('documentos')
        .select('*')
        .eq('paciente_id', pacienteId)
        .order('created_at', { ascending: false })

      setDocumentos(docs ?? [])
    } catch (err) {
      console.error('Error cargando paciente:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#0d3d7a]" />
      </div>
    )
  }

  if (!paciente) return null

  const adherencia = calcularAdherencia(registros)
  const edadPaciente = paciente.fecha_nacimiento ? edad(paciente.fecha_nacimiento) : null

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'resumen', label: 'Resumen IA', icon: <Brain size={15} /> },
    { key: 'graficos', label: 'Gráficos', icon: <BarChart2 size={15} /> },
    { key: 'registros', label: 'Registros', icon: <List size={15} /> },
    { key: 'documentos', label: 'Documentos', icon: <FileText size={15} /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-[#0d3d7a] text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/medico/dashboard"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="font-bold text-xl leading-tight">{paciente.nombre}</h1>
              <div className="flex items-center gap-3 text-blue-200 text-sm mt-0.5">
                {edadPaciente && <span>{edadPaciente} años</span>}
                {paciente.enfermedad && (
                  <>
                    {edadPaciente && <span>·</span>}
                    <span>{paciente.enfermedad}</span>
                  </>
                )}
                <span>·</span>
                <span>{registros.length} registros (30d)</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Métricas rápidas */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#0d3d7a]">{registros.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Registros (30d)</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${
                adherencia >= 80 ? 'text-emerald-600' :
                adherencia >= 50 ? 'text-amber-500' :
                'text-red-500'
              }`}>{adherencia}%</p>
              <p className="text-xs text-gray-500 mt-0.5">Adherencia</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-700">{documentos.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Documentos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setTabActivo(tab.key)}
                className={`flex items-center gap-2 px-4 py-4 text-sm font-medium border-b-2 transition-colors ${
                  tabActivo === tab.key
                    ? 'border-[#0d3d7a] text-[#0d3d7a]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenido del tab */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {tabActivo === 'resumen' && (
          <TabResumen
            paciente={paciente}
            registros={registros}
            documentos={documentos}
          />
        )}
        {tabActivo === 'graficos' && <TabGraficos registros={registros} />}
        {tabActivo === 'registros' && <TabRegistros registros={registros} />}
        {tabActivo === 'documentos' && <TabDocumentos documentos={documentos} />}
      </main>

    </div>
  )
}