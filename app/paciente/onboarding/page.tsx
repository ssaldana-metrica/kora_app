'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Stethoscope, Camera, ClipboardList, CheckCircle2, ArrowRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

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
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FB]">
        <div className="w-12 h-12 rounded-full border-4 border-[#0E9594] border-t-transparent animate-spin" />
      </div>
    )
  }

  const completados = pasos.filter(p => p.hecho).length
  const todoListo = completados === pasos.length

  return (
    <div className="min-h-screen bg-[#F4F7FB] pb-16">
      {/* Header */}
      <header className="bg-white px-6 pt-14 pb-8 shadow-sm">
        <p className="text-base font-semibold text-[#0E9594] mb-1 tracking-wide uppercase">
          Bienvenido{nombre ? `, ${nombre}` : ''}
        </p>
        <h1 className="text-3xl font-bold text-[#0E1B2A] leading-tight">
          Configura KORA{'\n'}en 3 pasos
        </h1>
        <p className="text-base text-[#5B6B7C] mt-2">
          Puedes hacerlos en cualquier orden.
        </p>

        {/* Progress bar */}
        <div className="flex gap-2 mt-6">
          {pasos.map(p => (
            <div
              key={p.clave}
              className="h-2 flex-1 rounded-full overflow-hidden bg-[#E5EAF0]"
            >
              {p.hecho && (
                <div className="h-full w-full rounded-full bg-[#0B2A4A]" />
              )}
            </div>
          ))}
        </div>
        <p className="text-base text-[#5B6B7C] mt-3 font-medium">
          {completados} de {pasos.length} completados
        </p>
      </header>

      {/* Step cards */}
      <main className="px-4 pt-6 flex flex-col gap-5 max-w-lg mx-auto">
        {todoListo && (
          <div className="bg-white rounded-[20px] p-8 shadow-md text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-[#E6F4F4] flex items-center justify-center">
                <CheckCircle2 className="text-[#0E9594]" size={40} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-[#0E1B2A] mb-2">
              ¡Todo listo!
            </h2>
            <p className="text-base text-[#5B6B7C]">
              Completaste la configuración. KORA está lista para acompañarte.
            </p>
          </div>
        )}

        {pasos.map((p, i) => (
          <div
            key={p.clave}
            className={`bg-white rounded-[20px] p-8 shadow-md ${p.hecho ? 'opacity-75' : ''}`}
          >
            <div className="flex items-start gap-5">
              {/* Icon circle */}
              <div className="shrink-0 w-20 h-20 rounded-full bg-[#E6F4F4] flex items-center justify-center">
                {p.hecho
                  ? <CheckCircle2 className="text-[#0E9594]" size={36} />
                  : <p.Icono className="text-[#0E9594]" size={36} />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-base font-semibold text-[#5B6B7C] mb-1">
                  Paso {i + 1}
                </p>
                <h2 className="text-2xl font-bold text-[#0E1B2A] leading-tight">
                  {p.titulo}
                </h2>
                <p className="text-base text-[#5B6B7C] mt-2">
                  {p.descripcion}
                </p>

                {p.hecho ? (
                  <p className="mt-4 text-base font-bold text-[#0E9594]">
                    Completado
                  </p>
                ) : (
                  <Link
                    href={p.href}
                    className="mt-5 flex items-center justify-center gap-2 bg-[#0E9594] text-white text-lg font-bold py-4 rounded-[20px] w-full active:scale-95 transition-transform shadow-sm"
                  >
                    {p.cta} <ArrowRight size={20} />
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Bottom action */}
        {todoListo ? (
          <Link
            href="/paciente/dashboard"
            className="block w-full text-center bg-[#0E9594] text-white text-2xl font-bold py-4 rounded-[20px] mt-2 active:scale-95 transition-all shadow-md"
          >
            Ir a mi inicio
          </Link>
        ) : (
          <div className="mt-2 text-center">
            <Link
              href="/paciente/dashboard"
              className="text-base text-[#5B6B7C] underline underline-offset-2"
            >
              Saltar por ahora
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
