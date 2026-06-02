'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import {
  Home,
  ClipboardList,
  FileText,
  User,
  LogOut,
  Search,
  CheckCircle2,
  MapPin,
  Stethoscope,
  QrCode,
} from 'lucide-react'

const NAV = [
  { href: '/paciente/dashboard', label: 'Inicio', Icon: Home },
  { href: '/paciente/registrar', label: 'Registrar', Icon: ClipboardList },
  { href: '/paciente/historial', label: 'Historial', Icon: FileText },
  { href: '/paciente/documentos', label: 'Docs', Icon: FileText },
  { href: '/paciente/perfil', label: 'Perfil', Icon: User },
]

interface MedicoResult {
  id: string
  nombre: string
  especialidad: string | null
  ubicacion: string | null
}

export default function Perfil() {
  const supabase = createClient()
  const router = useRouter()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [userId2, setUserId2] = useState<string | null>(null)
  const [medicoVinculado, setMedicoVinculado] = useState<{ nombre: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [resultados, setResultados] = useState<MedicoResult[]>([])
  const [buscando, setBuscando] = useState(false)
  const [vinculando, setVinculando] = useState<string | null>(null)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId2(user.id)

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
            .select('nombre')
            .eq('id', perfil.medico_id)
            .single()
          if (medico) setMedicoVinculado({ nombre: medico.nombre })
        }
      }

      setLoading(false)
    }
    cargar()
  }, [])

  const buscarMedicos = useCallback(async (q: string) => {
    if (q.length < 2) { setResultados([]); return }
    setBuscando(true)
    try {
      const res = await fetch(`/api/pacientes/buscar-medicos?q=${encodeURIComponent(q)}`)
      if (res.ok) setResultados(await res.json())
    } finally {
      setBuscando(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => buscarMedicos(query), 350)
    return () => clearTimeout(t)
  }, [query, buscarMedicos])

  async function vincular(medico: MedicoResult) {
    setVinculando(medico.id)
    setMensaje('')
    try {
      const res = await fetch('/api/pacientes/vincular-medico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicoId: medico.id }),
      })
      if (res.ok) {
        setMedicoVinculado({ nombre: medico.nombre })
        setQuery('')
        setResultados([])
        setMensaje(`✅ ¡Vinculado con éxito con ${medico.nombre}!`)
      }
    } finally {
      setVinculando(null)
    }
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

          {medicoVinculado ? (
            <div className="flex items-center gap-3 bg-green-50 rounded-2xl px-4 py-3">
              <CheckCircle2 className="text-green-500 shrink-0" size={22} />
              <div>
                <p className="text-sm font-semibold text-green-700">Médico vinculado</p>
                <p className="text-base text-green-600">{medicoVinculado.nombre}</p>
              </div>
            </div>
          ) : (
            <div className="bg-[#f8faff] rounded-2xl px-4 py-3">
              <p className="text-sm text-gray-400">Sin médico vinculado</p>
            </div>
          )}
        </div>

        {/* Buscador de médicos */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="text-[#1a56a4]" size={22} />
            <h2 className="text-xl font-bold text-gray-800">
              {medicoVinculado ? 'Cambiar médico' : 'Busca a tu médico'}
            </h2>
          </div>
          <p className="text-sm text-gray-400 mb-4">
            Escribe el nombre o especialidad de tu médico para vincularte.
          </p>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ej: García, cardiólogo..."
              className="w-full border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-base focus:outline-none focus:border-[#1a56a4]"
            />
          </div>

          {buscando && (
            <p className="text-sm text-gray-400 text-center py-2">Buscando...</p>
          )}

          {resultados.length > 0 && (
            <ul className="flex flex-col gap-2 mt-1">
              {resultados.map(medico => (
                <li key={medico.id} className="bg-[#f8faff] rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{medico.nombre}</p>
                      <div className="flex flex-wrap gap-x-3 mt-0.5">
                        {medico.especialidad && (
                          <span className="text-sm text-[#1a56a4]">{medico.especialidad}</span>
                        )}
                        {medico.ubicacion && (
                          <span className="text-sm text-gray-400 flex items-center gap-1">
                            <MapPin size={12} /> {medico.ubicacion}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => vincular(medico)}
                      disabled={vinculando === medico.id}
                      className="bg-[#1a56a4] text-white text-sm font-bold px-4 py-2 rounded-xl active:scale-95 transition-transform disabled:opacity-50 shrink-0"
                    >
                      {vinculando === medico.id ? '...' : 'Vincular'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {query.length >= 2 && !buscando && resultados.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-3">
              No encontramos médicos con ese nombre. Verifica que estén registrados en KORA.
            </p>
          )}

          {mensaje && (
            <p className="text-base mt-3 text-center font-medium text-gray-600">{mensaje}</p>
          )}
        </div>

        {/* Mi QR de KORA */}
        {userId2 && (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <QrCode className="text-[#1a56a4]" size={22} />
              <h2 className="text-xl font-bold text-gray-800">Mi QR de KORA</h2>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              Muéstraselo a tu médico en la consulta para vincularse contigo al instante.
            </p>
            <div className="flex justify-center bg-white p-4 rounded-2xl border border-gray-100">
              <QRCodeSVG
                value={`https://koraappverce.vercel.app/medico/vincular?paciente_id=${userId2}`}
                size={180}
                level="M"
              />
            </div>
          </div>
        )}

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
