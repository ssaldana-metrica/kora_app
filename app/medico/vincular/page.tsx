'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Loader2, User } from 'lucide-react'

interface PacienteInfo {
  nombre: string
  enfermedad?: string
  fecha_nacimiento?: string
}

function VincularContent() {
  const supabase = createClient()
  const router = useRouter()
  const params = useSearchParams()
  const pacienteId = params.get('paciente_id')

  const [paciente, setPaciente] = useState<PacienteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [vinculando, setVinculando] = useState(false)
  const [vinculado, setVinculado] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!pacienteId) { setError('QR inválido'); setLoading(false); return }

    supabase
      .from('profiles')
      .select('nombre, enfermedad, fecha_nacimiento')
      .eq('id', pacienteId)
      .eq('role', 'paciente')
      .single()
      .then(({ data }) => {
        if (data) setPaciente(data)
        else setError('Paciente no encontrado')
        setLoading(false)
      })
  }, [pacienteId])

  async function vincular() {
    if (!pacienteId) return
    setVinculando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      await supabase
        .from('profiles')
        .update({ medico_id: user.id })
        .eq('id', pacienteId)

      setVinculado(true)
    } catch {
      setError('Error al vincular. Intenta de nuevo.')
    } finally {
      setVinculando(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 size={32} className="animate-spin text-[#0d3d7a]" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0d3d7a] text-white px-4 py-4 flex items-center gap-3">
        <Link href="/medico/escanear" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-bold text-lg">Vincular paciente</h1>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center text-red-600">
            {error}
          </div>
        )}

        {vinculado && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <CheckCircle2 size={56} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">¡Paciente vinculado!</h2>
            <p className="text-gray-500 mb-6">
              {paciente?.nombre} ahora está en tu lista de pacientes.
            </p>
            <Link
              href={`/medico/paciente/${pacienteId}`}
              className="block bg-[#0d3d7a] text-white py-3 rounded-xl font-semibold text-center hover:bg-[#0b3268] transition-colors"
            >
              Ver detalle del paciente
            </Link>
          </div>
        )}

        {!error && !vinculado && paciente && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center">
                <User size={28} className="text-[#0d3d7a]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">{paciente.nombre}</h2>
                {paciente.enfermedad && (
                  <p className="text-sm text-gray-500">{paciente.enfermedad}</p>
                )}
                {paciente.fecha_nacimiento && (
                  <p className="text-sm text-gray-400">
                    {Math.floor((Date.now() - new Date(paciente.fecha_nacimiento).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} años
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={vincular}
              disabled={vinculando}
              className="w-full bg-[#0d3d7a] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#0b3268] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {vinculando ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
              {vinculando ? 'Vinculando...' : 'Vincular este paciente a mi cuenta'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function VincularPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 size={32} className="animate-spin text-[#0d3d7a]" />
      </div>
    }>
      <VincularContent />
    </Suspense>
  )
}
