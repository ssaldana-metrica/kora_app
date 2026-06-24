'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Home, ClipboardList, MessageCircle, History, User,
  Upload, Camera, FileText, Trash2,
} from 'lucide-react'

interface Documento {
  id: string
  nombre_archivo: string
  tipo: string
  created_at: string
  url: string
}

const NAV = [
  { href: '/paciente/dashboard',  label: 'Inicio',    Icon: Home },
  { href: '/paciente/registrar',  label: 'Registrar', Icon: ClipboardList },
  { href: '/paciente/chat',       label: 'Chat',      Icon: MessageCircle },
  { href: '/paciente/historial',  label: 'Historial', Icon: History },
  { href: '/paciente/perfil',     label: 'Perfil',    Icon: User },
]

export default function Documentos() {
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [subiendo, setSubiendo] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [eliminando, setEliminando] = useState<string | null>(null)

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

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${userId}/${Date.now()}_${safeName}`

    const { error: uploadError } = await supabase.storage.from('documentos').upload(path, file)

    if (uploadError) {
      console.error('Error subiendo documento:', uploadError)
      alert(`No se pudo subir el archivo: ${uploadError.message}`)
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

  async function handleEliminar(doc: Documento) {
    if (!confirm(`¿Eliminar "${doc.nombre_archivo}"?`)) return
    setEliminando(doc.id)

    await supabase.from('documentos').delete().eq('id', doc.id)
    setDocumentos(prev => prev.filter(d => d.id !== doc.id))
    setEliminando(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FB]">
        <div className="w-10 h-10 rounded-full border-4 border-[#0E9594] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-28">
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-6 shadow-sm">
        <h1 className="text-2xl font-bold text-[#0E1B2A]">Mis documentos</h1>
        <p className="text-sm text-[#5B6B7C] mt-1">Recetas, exámenes y resultados</p>
      </header>

      <main className="px-4 pt-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Sección 1: Recetas */}
        <div>
          <h2 className="text-xs font-bold text-[#5B6B7C] uppercase tracking-widest mb-3 px-1">
            Recetas
          </h2>
          <Link
            href="/paciente/receta"
            className="flex items-center gap-4 bg-[#0E9594] text-white rounded-[20px] p-5 shadow-md active:scale-[0.99] transition-transform"
          >
            <div className="bg-white/20 rounded-[12px] p-3">
              <Camera size={26} />
            </div>
            <div>
              <p className="text-base font-bold leading-tight">Tomar foto de receta</p>
              <p className="text-white/75 text-sm mt-0.5">KORA lee tus medicamentos automáticamente</p>
            </div>
          </Link>
        </div>

        {/* Sección 2: Resultados y otros */}
        <div>
          <h2 className="text-xs font-bold text-[#5B6B7C] uppercase tracking-widest mb-3 px-1">
            Resultados y otros documentos
          </h2>

          {/* Upload card */}
          <div
            className={`bg-white rounded-[20px] p-5 mb-4 border-2 ${
              subiendo
                ? 'border-[#0E9594]'
                : 'border-dashed border-[#E5EAF0]'
            } transition-colors`}
          >
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
              className="w-full bg-[#0E9594] text-white text-base font-semibold py-3 rounded-[16px] flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
            >
              <Upload size={18} />
              {subiendo ? 'Subiendo...' : 'Subir examen, resultado u otro'}
            </button>
            <p className="text-xs text-[#5B6B7C] mt-2 text-center">
              Formatos aceptados: imágenes y PDF
            </p>
          </div>

          {/* Document list */}
          {documentos.length > 0 ? (
            <div className="flex flex-col gap-3">
              {documentos.map(doc => (
                <div
                  key={doc.id}
                  className="bg-white rounded-[20px] p-4 border border-[#E5EAF0] shadow-sm flex items-center gap-4"
                >
                  {/* File icon */}
                  <div className="bg-[#E6F4F4] rounded-[12px] p-2 shrink-0">
                    <FileText className="text-[#0E9594]" size={22} />
                  </div>

                  {/* Info — opens document */}
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0"
                  >
                    <p className="font-semibold text-[#0E1B2A] truncate leading-snug">
                      {doc.nombre_archivo}
                    </p>
                    <p className="text-xs text-[#5B6B7C] mt-0.5">
                      {new Date(doc.created_at).toLocaleDateString('es-PE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </a>

                  {/* Delete */}
                  <button
                    onClick={() => handleEliminar(doc)}
                    disabled={eliminando === doc.id}
                    className="text-[#E0533D] hover:text-[#c04030] disabled:opacity-40 shrink-0 p-1 rounded-lg transition-colors"
                    aria-label="Eliminar documento"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-[20px] p-8 text-center border border-[#E5EAF0] shadow-sm">
              <div className="bg-[#E6F4F4] rounded-[16px] p-4 w-fit mx-auto mb-4">
                <FileText className="text-[#0E9594]" size={32} />
              </div>
              <p className="font-semibold text-[#0E1B2A] mb-1">Sin resultados aún</p>
              <p className="text-sm text-[#5B6B7C]">
                Sube tus exámenes o resultados de laboratorio
              </p>
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5EAF0] flex justify-around items-center h-20 px-2 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      {NAV.map(({ href, label, Icon }) => {
        const isActive = active === href
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 min-w-[56px] py-1 rounded-xl transition-colors ${
              isActive ? 'text-[#0E9594]' : 'text-[#5B6B7C]'
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
