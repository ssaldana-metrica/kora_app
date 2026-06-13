'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { trackEvent } from '@/lib/tracking'

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
      router.push(role === 'medico' ? '/medico/dashboard' : '/paciente/dashboard')
    } else {
      // Email confirmation required — el trigger ya creó el perfil
      setError('')
      router.push(`/login?mensaje=Revisa tu email para confirmar tu cuenta`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-md p-8">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">KORA</h1>
          <p className="text-gray-500 mt-1">Crea tu cuenta</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tu nombre"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Soy...</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRole('paciente')}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  role === 'paciente'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                🏥 Paciente
              </button>
              <button
                type="button"
                onClick={() => setRole('medico')}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  role === 'medico'
                    ? 'border-blue-600 bg-blue-50 text-blue-600'
                    : 'border-gray-200 text-gray-600'
                }`}
              >
                👨‍⚕️ Médico
              </button>
            </div>
          </div>

          {role === 'medico' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Especialidad <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={especialidad}
                  onChange={e => setEspecialidad(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Cardiología, Medicina General..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ciudad / Clínica <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={ubicacion}
                  onChange={e => setUbicacion(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Lima, Clínica San Borja..."
                />
              </div>
            </>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-blue-600 font-medium hover:underline">
            Inicia sesión
          </a>
        </p>
      </div>
    </div>
  )
}
