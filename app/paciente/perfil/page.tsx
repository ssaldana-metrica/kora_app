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
  LogOut,
  Link2,
  CheckCircle2,
} from 'lucide-react'

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV = [
  { href: '/paciente/dashboard', label: 'Inicio', Icon: Home },
  { href: '/paciente/registrar', label: 'Registrar', Icon: ClipboardList },
  { href: '/paciente/historial', label: 'Historial', Icon: FileText },
  { href: '/paciente/documentos', label: 'Docs', Icon: FileText },
  { href: '/paciente/perfil', label: 'Perfil', Icon: User },
]

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Perfil() {
  const supabase = createClient()
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [codigoMedico, setCodigoMedico] = useState('')
  const [inputCodigo, setInputCodigo] = useState('')
  const [loading, setLoading] = useState(true)
  const [vinculando, setVinculando] = useState(false)
  const [mensajeVinculo, setMensajeVinculo] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: perfil } = await supabase
        .from('profiles')
        .select('nombre, email, medico_id')
        .eq('id', user.id)
        .single()

      if (perfil) {
        setNombre(perfil.nombre ?? '')
        setEmail(perfil.email ?? '')

        if (perfil.medico_id) {
          const { data: medico } = await supabase
            .from('profiles')
            .select('nombre, codigo_medico')
            .eq('id', perfil.medico_id)
            .single()
          if (medico) setCodigoMedico(medico.codigo_medico ?? medico.nombre ?? '')
        }
      }

      setLoading(false)
    }
    cargar()
  }, [])

  async function vincularMedico() {
    if (!inputCodigo.trim() || !userId) return
    setVinculando(true)
    setMensajeVinculo('')

    const { data: medico } = await supabase
      .from('profiles')
      .select('id, nombre, codigo_medico')
      .eq('codigo_medico', inputCodigo.trim())
      .eq('role', 'medico')
      .single()

    if (!medico) {
      setMensajeVinculo('❌ No encontramos un médico con ese código. Verifica e intenta de nuevo.')
      setVinculando(false)
      return
    }

    await supabase
      .from('profiles')
      .update({ medico_id: medico.id })
      .eq('id', userId)

    setCodigoMedico(medico.codigo_medico ?? medico.nombre)
    setInputCodigo('')
    setMensajeVinculo(`✅ ¡Vinculado con éxito con el Dr./Dra. ${medico.nombre}!`)
    setVinculando(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login')
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
        <h1 className="text-2xl font-bold text-gray-800">Mi perfil</h1>
        <p className="text-base text-gray-400">Tu información personal</p>
      </header>

      <main className="px-4 pt-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Info personal */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 bg-[#e8f0fc] rounded-full flex items-center justify-center shrink-0">
              <User className="text-[#1a56a4]" size={32} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800">{nombre || 'Sin nombre'}</p>
              <p className="text-base text-gray-400">{email}</p>
            </div>
          </div>

          {/* Médico vinculado */}
          {codigoMedico ? (
            <div className="flex items-center gap-3 bg-green-50 rounded-2xl px-4 py-3">
              <CheckCircle2 className="text-green-500 shrink-0" size={22} />
              <div>
                <p className="text-sm font-semibold text-green-700">Médico vinculado</p>
                <p className="text-base text-green-600">{codigoMedico}</p>
              </div>
            </div>
          ) : (
            <div className="bg-[#f8faff] rounded-2xl px-4 py-3">
              <p className="text-sm text-gray-400">Sin médico vinculado</p>
            </div>
          )}
        </div>

        {/* Vincular médico */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="text-[#1a56a4]" size={22} />
            <h2 className="text-xl font-bold text-gray-800">
              {codigoMedico ? 'Cambiar médico' : '¿Tienes el código de tu médico?'}
            </h2>
          </div>
          <p className="text-base text-gray-400 mb-4">
            Tu médico te dará un código único para vincularse contigo.
          </p>
          <input
            type="text"
            value={inputCodigo}
            onChange={e => setInputCodigo(e.target.value.toUpperCase())}
            placeholder="Ej: MED-12345"
            className="w-full text-xl border border-gray-200 rounded-2xl px-4 py-3 focus:outline-none focus:border-[#1a56a4] mb-3 tracking-widest font-mono"
          />
          <button
            onClick={vincularMedico}
            disabled={vinculando || !inputCodigo.trim()}
            className="w-full bg-[#1a56a4] text-white text-xl font-bold py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-50"
          >
            {vinculando ? 'Buscando...' : 'Vincular médico'}
          </button>
          {mensajeVinculo && (
            <p className="text-base mt-3 text-center font-medium text-gray-600">{mensajeVinculo}</p>
          )}
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={cerrarSesion}
          className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 w-full active:scale-[0.99] transition-transform"
        >
          <div className="bg-red-50 rounded-xl p-3">
            <LogOut className="text-red-500" size={22} />
          </div>
          <span className="text-lg font-semibold text-red-500">Cerrar sesión</span>
        </button>

      </main>

      <BottomNav active="/paciente/perfil" />
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