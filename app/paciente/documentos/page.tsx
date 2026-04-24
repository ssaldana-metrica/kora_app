'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  ClipboardList,
  FileText,
  User,
  Upload,
  Pill,
  CheckCircle2,
  Clock,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Documento {
  id: string
  nombre: string
  tipo: string
  created_at: string
  url: string
}

interface Medicamento {
  id: string
  nombre: string
  dosis: string
  frecuencia_horas: number
  duracion_dias: number | null
  instrucciones_especiales: string | null
  activo: boolean
  created_at: string
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV = [
  { href: '/paciente/dashboard', label: 'Inicio', Icon: Home },
  { href: '/paciente/registrar', label: 'Registrar', Icon: ClipboardList },
  { href: '/paciente/historial', label: 'Historial', Icon: FileText },
  { href: '/paciente/documentos', label: 'Docs', Icon: FileText },
  { href: '/paciente/perfil', label: 'Perfil', Icon: User },
]

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Documentos() {
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([])
  const [loading, setLoading] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [mensajeProcesando, setMensajeProcesando] = useState('')
  const [tipo, setTipo] = useState('receta')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: docs } = await supabase
        .from('documentos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const { data: meds } = await supabase
        .from('medicamentos')
        .select('*')
        .eq('user_id', user.id)
        .eq('activo', true)
        .order('created_at', { ascending: false })

      setDocumentos(docs ?? [])
      setMedicamentos(meds ?? [])
      setLoading(false)
    }
    cargar()
  }, [])

  async function handleSubir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setSubiendo(true)

    const ext = file.name.split('.').pop()
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(path, file)

    if (uploadError) {
      alert('Error al subir el archivo')
      setSubiendo(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(path)

    const { data: doc } = await supabase
      .from('documentos')
      .insert({
        user_id: userId,
        nombre: file.name,
        tipo,
        url: urlData.publicUrl,
      })
      .select()
      .single()

    if (doc) {
      setDocumentos(prev => [doc, ...prev])
    }

    setSubiendo(false)

    if (tipo === 'receta' && doc) {
      setProcesando(true)
      setMensajeProcesando('Estamos procesando tu receta con IA. En unos minutos tendrás tu plan de medicación listo. ✨')

      try {
        const res = await fetch('/api/procesar-receta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentoId: doc.id, imageUrl: urlData.publicUrl, userId }),
        })

        if (res.ok) {
          const { medicamentos: nuevos } = await res.json()
          if (nuevos?.length > 0) {
            setMensajeProcesando(`✅ Encontramos ${nuevos.length} medicamento(s). ¡Revisa tu plan abajo!`)
            const { data: meds } = await supabase
              .from('medicamentos')
              .select('*')
              .eq('user_id', userId)
              .eq('activo', false)
              .order('created_at', { ascending: false })
              .limit(nuevos.length)
            if (meds) setMedicamentos(prev => [...meds, ...prev])
          }
        }
      } catch {
        setMensajeProcesando('Hubo un problema al procesar la receta. Intenta de nuevo.')
      }
    }
  }

  async function confirmarMedicamentos() {
    if (!userId) return
    await supabase
      .from('medicamentos')
      .update({ activo: true })
      .eq('user_id', userId)
      .eq('activo', false)

    const { data: meds } = await supabase
      .from('medicamentos')
      .select('*')
      .eq('user_id', userId)
      .eq('activo', true)

    setMedicamentos(meds ?? [])
    setProcesando(false)
    setMensajeProcesando('')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faff]">
        <div className="w-10 h-10 rounded-full border-4 border-[#1a56a4] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8faff] pb-28">
      <header className="bg-white px-5 pt-12 pb-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">Mis documentos</h1>
        <p className="text-base text-gray-400">Recetas, exámenes y resultados</p>
      </header>

      <main className="px-4 pt-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Card subir documento */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Subir documento</h2>

          {/* Selector de tipo */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {[
              { value: 'receta', label: '📋 Receta' },
              { value: 'examen', label: '🔬 Examen' },
              { value: 'resultado', label: '📊 Resultado' },
              { value: 'otro', label: '📄 Otro' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTipo(value)}
                className={`py-3 rounded-2xl border-2 text-base font-semibold transition-all ${
                  tipo === value
                    ? 'border-[#1a56a4] bg-[#e8f0fc] text-[#1a56a4]'
                    : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleSubir}
            className="hidden"
          />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={subiendo}
            className="w-full bg-[#1a56a4] text-white text-xl font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
          >
            <Upload size={24} />
            {subiendo ? 'Subiendo...' : 'Seleccionar archivo'}
          </button>

          {tipo === 'receta' && !subiendo && (
            <p className="text-sm text-gray-400 mt-3 text-center">
              📋 Las recetas serán procesadas con IA para crear tu plan de medicación
            </p>
          )}
        </div>

        {/* Mensaje procesando IA */}
        {mensajeProcesando && (
          <div className="bg-[#e8f0fc] rounded-2xl p-5 border border-[#1a56a4]/20">
            <p className="text-[#1a56a4] font-semibold text-base">{mensajeProcesando}</p>
            {procesando && medicamentos.some(m => !m.activo) && (
              <button
                onClick={confirmarMedicamentos}
                className="mt-4 w-full bg-[#1a56a4] text-white font-bold text-lg py-3 rounded-2xl"
              >
                ✅ Confirmar plan de medicación
              </button>
            )}
          </div>
        )}

        {/* Medicamentos activos */}
        {medicamentos.length > 0 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Pill className="text-[#1a56a4]" size={22} />
              <h2 className="text-xl font-bold text-gray-800">Medicamentos activos</h2>
            </div>
            <ul className="flex flex-col gap-3">
              {medicamentos.map(med => (
                <li key={med.id} className="bg-[#f8faff] rounded-2xl px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-lg font-bold text-gray-800">{med.nombre}</p>
                      <p className="text-sm text-gray-500">{med.dosis}</p>
                      <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                        <Clock size={13} /> Cada {med.frecuencia_horas}h
                        {med.duracion_dias && ` · ${med.duracion_dias} días`}
                      </p>
                      {med.instrucciones_especiales && (
                        <p className="text-xs text-[#1a56a4] mt-1">ℹ️ {med.instrucciones_especiales}</p>
                      )}
                    </div>
                    <CheckCircle2 className="text-green-500 shrink-0 mt-1" size={22} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Lista de documentos */}
        {documentos.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-gray-600 px-1">Documentos subidos</h2>
            {documentos.map(doc => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.99] transition-transform"
              >
                <div className="bg-[#e8f0fc] rounded-xl p-3 shrink-0">
                  <FileText className="text-[#1a56a4]" size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-gray-800 truncate">{doc.nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.tipo === 'receta' && (
                      <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">
                        📋 Receta
                      </span>
                    )}
                    {doc.tipo === 'examen' && (
                      <span className="text-xs bg-purple-50 text-purple-600 font-medium px-2 py-0.5 rounded-full">
                        🔬 Examen
                      </span>
                    )}
                    {doc.tipo === 'resultado' && (
                      <span className="text-xs bg-green-50 text-green-600 font-medium px-2 py-0.5 rounded-full">
                        📊 Resultado
                      </span>
                    )}
                    {doc.tipo === 'otro' && (
                      <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full">
                        📄 Otro
                      </span>
                    )}
                    <span className="text-xs text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        {documentos.length === 0 && (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
            <p className="text-5xl mb-4">📂</p>
            <p className="text-xl font-bold text-gray-700 mb-2">Aún no tienes documentos</p>
            <p className="text-base text-gray-400">Sube tu primera receta o examen</p>
          </div>
        )}

      </main>

      <BottomNav active="/paciente/documentos" />
    </div>
  )
}

function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-20 px-2 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {NAV.map(({ href, label, Icon }) => {
        const isActive = active === href
        return (
          <Link key={href} href={href} className={`flex flex-col items-center gap-1 min-w-[56px] py-1 rounded-xl transition-colors ${isActive ? 'text-[#1a56a4]' : 'text-gray-400'}`}>
            <Icon size={24} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className={`text-xs ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}