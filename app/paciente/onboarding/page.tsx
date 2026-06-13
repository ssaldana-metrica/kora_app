'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Stethoscope, Camera, ClipboardList, CheckCircle2, ArrowRight } from 'lucide-react'

interface Paso {
  clave: 'medico' | 'receta' | 'registro'
  titulo: string
  descripcion: string
  cta: string
  href: string
  Icono: typeof Stethoscope
  hecho: boolean
}

export default function OnboardingPaciente() {
  const supabase = createClient()
  const router = useRouter()

  const [pasos, setPasos] = useState<Paso[] | null>(null)
  const [nombre, setNombre] = useState('')

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: perfil } = await supabase
        .from('profiles')
        .select('nombre, medico_id')
        .eq('id', user.id)
        .single()
      setNombre(perfil?.nombre?.split(' ')[0] ?? '')

      const { count: medsCount } = await supabase
        .from('medicamentos')
        .select('id', { count: 'exact', head: true })
        .eq('paciente_id', user.id)

      const { count: regsCount } = await supabase
        .from('registros')
        .select('id', { count: 'exact', head: true })
        .eq('paciente_id', user.id)

      setPasos([
        {
          clave: 'medico',
          titulo: 'Vincula a tu médico',
          descripcion: 'Así tu médico podrá ver cómo te sientes entre consultas.',
          cta: 'Buscar a mi médico',
          href: '/paciente/perfil',
          Icono: Stethoscope,
          hecho: !!perfil?.medico_id,
        },
        {
          clave: 'receta',
          titulo: 'Toma una foto de tu receta',
          descripcion: 'KORA leerá tus medicamentos automáticamente. Sin teclear.',
          cta: 'Tomar foto de receta',
          href: '/paciente/receta',
          Icono: Camera,
          hecho: (medsCount ?? 0) > 0,
        },
        {
          clave: 'registro',
          titulo: 'Haz tu primer registro',
          descripcion: 'Cuéntanos cómo te sientes hoy. Solo toma 2 minutos.',
          cta: 'Registrar ahora',
          href: '/paciente/registrar',
          Icono: ClipboardList,
          hecho: (regsCount ?? 0) > 0,
        },
      ])
    }
    cargar()
  }, [])

  if (!pasos) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8faff]">
        <div className="w-10 h-10 rounded-full border-4 border-[#1a56a4] border-t-transparent animate-spin" />
      </div>
    )
  }

  const completados = pasos.filter(p => p.hecho).length
  const todoListo = completados === pasos.length

  return (
    <div className="min-h-screen bg-[#f8faff] pb-12">
      <header className="bg-white px-5 pt-12 pb-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">
          ¡Bienvenido{nombre ? `, ${nombre}` : ''}! 👋
        </h1>
        <p className="text-base text-gray-500 mt-1">
          Configura KORA en 3 pasos. Puedes hacerlos en cualquier orden.
        </p>
        <div className="flex gap-2 mt-4">
          {pasos.map(p => (
            <div
              key={p.clave}
              className={`h-2 flex-1 rounded-full ${p.hecho ? 'bg-[#22c55e]' : 'bg-gray-200'}`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-400 mt-2">{completados} de {pasos.length} completados</p>
      </header>

      <main className="px-4 pt-5 flex flex-col gap-4 max-w-lg mx-auto">
        {pasos.map((p, i) => (
          <div
            key={p.clave}
            className={`rounded-3xl p-5 border shadow-sm ${p.hecho ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-100'}`}
          >
            <div className="flex items-start gap-4">
              <div className={`rounded-2xl p-3 shrink-0 ${p.hecho ? 'bg-emerald-100' : 'bg-[#e8f0fc]'}`}>
                {p.hecho
                  ? <CheckCircle2 className="text-emerald-600" size={28} />
                  : <p.Icono className="text-[#1a56a4]" size={28} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-400">Paso {i + 1}</p>
                <h2 className="text-lg font-bold text-gray-800 leading-tight">{p.titulo}</h2>
                <p className="text-base text-gray-500 mt-1">{p.descripcion}</p>
                {!p.hecho && (
                  <Link
                    href={p.href}
                    className="mt-4 inline-flex items-center gap-2 bg-[#1a56a4] text-white text-base font-bold px-5 py-3 rounded-2xl active:scale-95 transition-transform"
                  >
                    {p.cta} <ArrowRight size={18} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}

        <Link
          href="/paciente/dashboard"
          className={`block w-full text-center text-xl font-bold py-4 rounded-2xl mt-2 active:scale-95 transition-all shadow-md ${
            todoListo ? 'bg-[#22c55e] text-white' : 'bg-white text-[#1a56a4] border border-gray-200'
          }`}
        >
          {todoListo ? '¡Listo! Ir a mi inicio' : 'Saltar por ahora'}
        </Link>
      </main>
    </div>
  )
}
