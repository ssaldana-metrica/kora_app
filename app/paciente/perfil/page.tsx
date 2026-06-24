'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import {
  Home,
  ClipboardList,
  MessageCircle,
  FileText,
  User,
  LogOut,
  Search,
  CheckCircle2,
  MapPin,
  Stethoscope,
  QrCode,
  Shield,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/paciente/dashboard', label: 'Inicio', Icon: Home },
  { href: '/paciente/registrar', label: 'Registrar', Icon: ClipboardList },
  { href: '/paciente/chat', label: 'Chat', Icon: MessageCircle },
  { href: '/paciente/historial', label: 'Historial', Icon: FileText },
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
        setMensaje(`Vinculado con exito con ${medico.nombre}`)
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
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FB]">
        <div className="w-10 h-10 rounded-full border-4 border-[#0E9594] border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-28">
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-5 shadow-sm">
        <h1 className="text-2xl font-bold text-[#0E1B2A]">Mi perfil</h1>
        <p className="text-sm text-[#5B6B7C] mt-0.5">Tu informacion personal</p>
      </header>

      <main className="px-4 pt-5 flex flex-col gap-4 max-w-lg mx-auto">

        {/* Tarjeta de perfil */}
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 bg-[#E6F4F4] rounded-full flex items-center justify-center shrink-0">
              <User className="text-[#0E9594]" size={30} />
            </div>
            <div>
              <p className="text-xl font-bold text-[#0E1B2A]">{nombre || 'Sin nombre'}</p>
              <p className="text-sm text-[#5B6B7C]">{email}</p>
            </div>
          </div>

          {medicoVinculado ? (
            <div className="flex items-center gap-3 bg-[#E6F4F4] border border-[#0E9594]/20 rounded-[12px] p-3">
              <CheckCircle2 className="text-[#16A571] shrink-0" size={20} />
              <div>
                <p className="text-xs font-semibold text-[#0E1B2A]">Medico vinculado</p>
                <p className="text-sm text-[#5B6B7C]">{medicoVinculado.nombre}</p>
              </div>
            </div>
          ) : (
            <div className="bg-[#F4F7FB] border border-[#E5EAF0] rounded-[12px] p-3">
              <p className="text-sm text-[#5B6B7C]">Sin medico vinculado</p>
            </div>
          )}
        </div>

        {/* Buscador de medicos */}
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <Stethoscope className="text-[#0E9594]" size={20} />
            <h2 className="text-base font-bold text-[#0E1B2A]">
              {medicoVinculado ? 'Cambiar medico' : 'Busca a tu medico'}
            </h2>
          </div>
          <p className="text-sm text-[#5B6B7C] mb-4">
            Escribe el nombre o especialidad de tu medico para vincularte.
          </p>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7C]" size={17} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ej: Garcia, cardiologo..."
              className="w-full border border-[#E5EAF0] rounded-[16px] pl-10 pr-4 py-3 text-sm text-[#0E1B2A] placeholder:text-[#5B6B7C]/60 focus:outline-none focus:ring-2 focus:ring-[#0E9594]/30 focus:border-[#0E9594] transition-all"
            />
          </div>

          {buscando && (
            <p className="text-sm text-[#5B6B7C] text-center py-2">Buscando...</p>
          )}

          {resultados.length > 0 && (
            <ul className="flex flex-col gap-2 mt-1">
              {resultados.map(medico => (
                <li key={medico.id} className="bg-[#F4F7FB] rounded-[16px] border border-[#E5EAF0] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#0E1B2A] text-sm truncate">{medico.nombre}</p>
                      <div className="flex flex-wrap gap-x-3 mt-0.5">
                        {medico.especialidad && (
                          <span className="text-xs text-[#0E9594]">{medico.especialidad}</span>
                        )}
                        {medico.ubicacion && (
                          <span className="text-xs text-[#5B6B7C] flex items-center gap-1">
                            <MapPin size={11} /> {medico.ubicacion}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => vincular(medico)}
                      disabled={vinculando === medico.id}
                      className="bg-[#0E9594] text-white text-sm font-semibold px-4 py-2 rounded-[12px] active:scale-95 transition-transform disabled:opacity-50 shrink-0"
                    >
                      {vinculando === medico.id ? '...' : 'Vincular'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {query.length >= 2 && !buscando && resultados.length === 0 && (
            <p className="text-sm text-[#5B6B7C] text-center py-3">
              No encontramos medicos con ese nombre. Verifica que esten registrados en KORA.
            </p>
          )}

          {mensaje && (
            <p className="text-sm mt-3 text-center font-medium text-[#16A571]">{mensaje}</p>
          )}
        </div>

        {/* QR de KORA */}
        {userId2 && (
          <div className="bg-white rounded-[20px] shadow-sm p-6">
            <div className="flex items-center gap-2 mb-1">
              <QrCode className="text-[#0E9594]" size={20} />
              <h2 className="text-base font-bold text-[#0E1B2A]">Mi QR de KORA</h2>
            </div>
            <p className="text-sm text-[#5B6B7C] mb-5">
              Muestraselo a tu medico en la consulta para vincularse contigo al instante.
            </p>
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-[16px] border border-[#E5EAF0]">
                <QRCodeSVG
                  value={`https://koraappverce.vercel.app/medico/vincular?paciente_id=${userId2}`}
                  size={180}
                  level="M"
                />
              </div>
            </div>
          </div>
        )}

        {/* Privacidad */}
        <div className="bg-white rounded-[20px] shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="text-[#0E9594]" size={20} />
            <h2 className="text-base font-bold text-[#0E1B2A]">Tu informacion es tuya</h2>
          </div>
          <p className="text-sm text-[#5B6B7C] leading-relaxed">
            Tu eres el dueno de tus datos de salud. Solo el medico que tu elijas vincular
            puede verlos, y puedes desvincularte cuando quieras. KORA no comparte tu
            informacion con nadie mas.
          </p>
        </div>

        {/* Cerrar sesion */}
        <button
          onClick={cerrarSesion}
          className="bg-white rounded-[20px] shadow-sm p-5 flex items-center gap-4 w-full active:scale-[0.99] transition-transform"
        >
          <div className="bg-red-50 rounded-[12px] p-3">
            <LogOut className="text-[#E0533D]" size={20} />
          </div>
          <span className="text-base font-semibold text-[#E0533D]">Cerrar sesion</span>
        </button>

      </main>

      <BottomNav active="/paciente/perfil" />
    </div>
  )
}

function BottomNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5EAF0] flex justify-around items-center h-20 px-2 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
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
