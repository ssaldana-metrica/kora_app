'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home, ClipboardList, FileText, User,
  Upload, Camera, CheckCircle2,
} from 'lucide-react'

interface Documento {
  id: string
  nombre_archivo: string
  tipo: string
  created_at: string
  url: string
}

const NAV = [
  { href: '/paciente/dashboard',   label: 'Inicio',    Icon: Home },
  { href: '/paciente/registrar',   label: 'Registrar', Icon: ClipboardList },
  { href: '/paciente/historial',   label: 'Historial', Icon: FileText },
  { href: '/paciente/documentos',  label: 'Docs',      Icon: FileText },
  { href: '/paciente/perfil',      label: 'Perfil',    Icon: User },
]

export default function Documentos() {
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: docs } = await supabase
        .from('documentos')
        .select('*')
        .eq('paciente_id', user.id)
        .neq('tipo', 'receta')
        .order('created_at', { ascending: false })

      setDocumentos(docs ?? [])
      setLoading(false)
    }
    cargar()
  }, [])

  async function handleSubir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setSubiendo(true)

    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage.from('documentos').upload(path, file)

    if (uploadError) {
      alert('Error al subir el archivo. Verifica que el tamaño no sea mayor a 50MB.')
      setSubiendo(false)
      return
    }

    const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path)

    const { data: doc } = await supabase
      .from('documentos')
      .insert({
        paciente_id: userId,
        nombre_archivo: file.name,
        tipo: 'resultado',
        url: urlData.publicUrl,
      })
      .select()
      .single()

    if (doc) setDocumentos(prev => [doc, ...prev])
    setSubiendo(false)
    if (fileRef.current) fileRef.current.value = ''
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

        {/* Sección 1: Recetas (flujo principal) */}
        <div>
          <h2 className="text-base font-bold text-gray-500 uppercase tracking-wide mb-3 px-1">Recetas</h2>
          <Link
            href="/paciente/receta"
            className="flex items-center gap-4 bg-gradient-to-r from-[#1a56a4] to-[#0d3d7a] text-white rounded-2xl p-5 shadow-md active:scale-[0.99] transition-transform"
          >
            <div className="bg-white/20 rounded-xl p-3">
              <Camera size={28} />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight">Tomar foto de receta</p>
              <p className="text-white/75 text-sm">KORA lee tus medicamentos automáticamente</p>
            </div>
          </Link>
        </div>

        {/* Sección 2: Resultados y otros */}
        <div>
          <h2 className="text-base font-bold text-gray-500 uppercase tracking-wide mb-3 px-1">
            Resultados y otros documentos
          </h2>

          <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-3">
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
              className="w-full bg-[#f0f4ff] border-2 border-dashed border-[#1a56a4]/30 text-[#1a56a4] text-base font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
            >
              <Upload size={20} />
              {subiendo ? 'Subiendo...' : 'Subir examen, resultado u otro'}
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Formatos aceptados: imágenes y PDF
            </p>
          </div>

          {documentos.length > 0 ? (
            <div className="flex flex-col gap-3">
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
                    <p className="text-base font-bold text-gray-800 truncate">{doc.nombre_archivo}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {doc.tipo === 'examen' && <span className="text-xs bg-purple-50 text-purple-600 font-medium px-2 py-0.5 rounded-full">🔬 Examen</span>}
                      {doc.tipo === 'resultado' && <span className="text-xs bg-green-50 text-green-600 font-medium px-2 py-0.5 rounded-full">📊 Resultado</span>}
                      {doc.tipo === 'otro' && <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full">📄 Otro</span>}
                      <span className="text-xs text-gray-400">
                        {new Date(doc.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <CheckCircle2 className="text-gray-300 shrink-0" size={18} />
                </a>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
              <p className="text-4xl mb-3">📂</p>
              <p className="text-lg font-bold text-gray-700 mb-1">Sin resultados aún</p>
              <p className="text-sm text-gray-400">Sube tus exámenes o resultados de laboratorio</p>
            </div>
          )}
        </div>

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
