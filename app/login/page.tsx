'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Heart, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const mensaje = searchParams.get('mensaje')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
      return
    }

    // Obtener rol del usuario
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user!.id)
      .single()

    if (profile?.role === 'medico') {
      router.push('/medico/dashboard')
    } else {
      router.push('/paciente/dashboard')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#F4F7FB' }}
    >
      <div
        className="w-full max-w-md p-8"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          boxShadow:
            '0 1px 2px rgba(11,42,74,0.04), 0 8px 24px rgba(11,42,74,0.06)',
        }}
      >
        {/* Top section: icon + logo + tagline */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-3">
            <Heart size={32} color="#0E9594" strokeWidth={2} />
          </div>
          <h1
            className="font-bold text-3xl tracking-tight"
            style={{ color: '#0B2A4A' }}
          >
            KORA
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#5B6B7C' }}>
            Tu salud, monitoreada
          </p>
        </div>

        {/* Email confirmation message */}
        {mensaje && (
          <div
            className="mb-5 p-3 text-sm"
            style={{
              backgroundColor: '#f0fdf4',
              color: '#166534',
              borderRadius: '12px',
              border: '1px solid #bbf7d0',
            }}
          >
            {mensaje}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold mb-1"
              style={{ color: '#0E1B2A' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              className="w-full text-base px-4 py-3 bg-white focus:outline-none"
              style={{
                border: '1px solid #E5EAF0',
                borderRadius: '16px',
              }}
              onFocus={e => {
                e.currentTarget.style.boxShadow = '0 0 0 2px #0E9594'
                e.currentTarget.style.borderColor = '#0E9594'
              }}
              onBlur={e => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = '#E5EAF0'
              }}
            />
          </div>

          {/* Password field */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold mb-1"
              style={{ color: '#0E1B2A' }}
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full text-base px-4 py-3 bg-white focus:outline-none"
              style={{
                border: '1px solid #E5EAF0',
                borderRadius: '16px',
              }}
              onFocus={e => {
                e.currentTarget.style.boxShadow = '0 0 0 2px #0E9594'
                e.currentTarget.style.borderColor = '#0E9594'
              }}
              onBlur={e => {
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = '#E5EAF0'
              }}
            />
          </div>

          {/* Error message */}
          {error && (
            <div
              className="p-3 text-sm"
              style={{
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                borderRadius: '12px',
              }}
            >
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white font-bold text-lg py-4 transition-all active:scale-95"
            style={{
              backgroundColor: loading ? '#0E9594' : '#0E9594',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(14,149,148,0.30)',
              opacity: loading ? 0.5 : 1,
            }}
            onMouseEnter={e => {
              if (!loading) e.currentTarget.style.backgroundColor = '#0b8180'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#0E9594'
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin" />
                Ingresando...
              </span>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>

        {/* Bottom link */}
        <p className="text-center text-sm mt-6" style={{ color: '#5B6B7C' }}>
          ¿No tienes cuenta?{' '}
          <a
            href="/register"
            className="font-semibold hover:underline"
            style={{ color: '#0E9594' }}
          >
            Regístrate
          </a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: '#F4F7FB' }}
        >
          <Loader2 size={32} className="animate-spin" style={{ color: '#0E9594' }} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
