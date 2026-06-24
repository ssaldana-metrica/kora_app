'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/tracking'
import { Heart, Stethoscope, User } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'paciente' | 'medico'>('paciente')
  const [especialidad, setEspecialidad] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Pasamos los datos en options.data para que el trigger los use al crear el perfil
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, role, especialidad: especialidad || null, ubicacion: ubicacion || null },
      },
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Error al registrarse')
      setLoading(false)
      return
    }

    // Supabase devuelve un user con identities vacío cuando el correo ya está registrado
    if (data.user.identities && data.user.identities.length === 0) {
      setError('Ya existe una cuenta con este correo. Inicia sesión.')
      setLoading(false)
      return
    }

    // Si hay sesión activa (email confirm desactivado), actualizamos el perfil con todos los datos
    if (data.session) {
      const updateData: Record<string, string | null> = { nombre, role }
      if (role === 'medico') {
        updateData.especialidad = especialidad || null
        updateData.ubicacion = ubicacion || null
      }
      await supabase.from('profiles').update(updateData).eq('id', data.user.id)
    }

    await trackEvent(role === 'medico' ? 'medico_crea_cuenta' : 'paciente_crea_cuenta', {
      userId: data.user.id,
    })

    if (data.session) {
      router.push(role === 'medico' ? '/medico/dashboard' : '/paciente/onboarding')
    } else {
      // Email confirmation required — el trigger ya creó el perfil
      setError('')
      router.push(`/login?mensaje=Revisa tu email para confirmar tu cuenta`)
    }
  }

  const inputClass =
    'w-full border border-[#E5EAF0] rounded-[16px] px-4 py-3 text-base bg-white focus:outline-none focus:ring-2 focus:ring-[#0E9594] transition-shadow'

  return (
    <div className="min-h-screen bg-[#F4F7FB] py-8 px-4">
      <div className="bg-white rounded-[20px] shadow-md max-w-md mx-auto p-8 my-8">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="text-[#0E9594]" size={32} strokeWidth={2.5} />
            <span className="text-3xl font-bold text-[#0B2A4A]">KORA</span>
          </div>
          <p className="text-[#5B6B7C] text-base">Crea tu cuenta</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">

          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-[#0E1B2A] mb-1">
              Nombre completo
            </label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              className={inputClass}
              placeholder="Tu nombre"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-[#0E1B2A] mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={inputClass}
              placeholder="tu@email.com"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-semibold text-[#0E1B2A] mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          {/* Role selector */}
          <div>
            <label className="block text-sm font-semibold text-[#0E1B2A] mb-2">
              Soy...
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole('paciente')}
                className={`flex items-center justify-center gap-2 rounded-[16px] py-3 font-semibold text-base transition-all flex-1 border ${
                  role === 'paciente'
                    ? 'bg-[#0B2A4A] text-white border-[#0B2A4A]'
                    : 'bg-white text-[#5B6B7C] border-[#E5EAF0]'
                }`}
              >
                <Stethoscope size={18} />
                Paciente
              </button>
              <button
                type="button"
                onClick={() => setRole('medico')}
                className={`flex items-center justify-center gap-2 rounded-[16px] py-3 font-semibold text-base transition-all flex-1 border ${
                  role === 'medico'
                    ? 'bg-[#0B2A4A] text-white border-[#0B2A4A]'
                    : 'bg-white text-[#5B6B7C] border-[#E5EAF0]'
                }`}
              >
                <User size={18} />
                Médico
              </button>
            </div>
          </div>

          {/* Medico-only fields */}
          {role === 'medico' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-[#0E1B2A] mb-1">
                  Especialidad{' '}
                  <span className="text-[#5B6B7C] font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={especialidad}
                  onChange={e => setEspecialidad(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: Cardiología, Medicina General..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0E1B2A] mb-1">
                  Ciudad / Clínica{' '}
                  <span className="text-[#5B6B7C] font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={e => setUbicacion(e.target.value)}
                  className={inputClass}
                  placeholder="Ej: Lima, Clínica San Borja..."
                />
              </div>
            </>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 rounded-[12px] p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="bg-[#0E9594] text-white font-bold text-lg py-4 rounded-[16px] w-full disabled:opacity-60 transition-opacity mt-2"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        {/* Bottom link */}
        <p className="text-center text-sm text-[#5B6B7C] mt-6">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-[#0E9594] font-semibold hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  )
}
