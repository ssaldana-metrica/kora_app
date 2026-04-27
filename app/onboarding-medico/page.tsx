'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  UserPlus,
  Copy,
  Share2,
  Stethoscope,
  CheckCircle,
  ChevronRight,
  Smartphone,
} from 'lucide-react'

const PASOS = [
  {
    numero: 1,
    icono: UserPlus,
    color: 'bg-blue-100 text-blue-600',
    titulo: 'Crea tu cuenta de médico',
    descripcion:
      'Regístrate en KORA eligiendo el rol "Médico". Solo necesitas tu email y una contraseña.',
    detalle: 'Tarda menos de 2 minutos.',
    accion: {
      texto: 'Crear cuenta ahora',
      href: '/register',
      externo: false,
    },
  },
  {
    numero: 2,
    icono: Copy,
    color: 'bg-emerald-100 text-emerald-600',
    titulo: 'Copia tu código único',
    descripcion:
      'Al crear tu cuenta, KORA te asignará un código como KORA-DR-2847. Ese código es tuyo — con él tus pacientes se vinculan a ti.',
    detalle: 'Lo encuentras en tu dashboard, arriba a la izquierda.',
    accion: null,
  },
  {
    numero: 3,
    icono: Share2,
    color: 'bg-purple-100 text-purple-600',
    titulo: 'Comparte con tus pacientes',
    descripcion:
      'Dile a cada paciente que descargue KORA (o abra kora.app en su celular) y escriba tu código en la sección "Vincular médico" de su perfil.',
    detalle: 'Puedes mandarles el mensaje de abajo por WhatsApp.',
    accion: {
      texto: 'Copiar mensaje para pacientes',
      href: '#mensaje-paciente',
      externo: false,
    },
  },
  {
    numero: 4,
    icono: Stethoscope,
    color: 'bg-orange-100 text-orange-600',
    titulo: 'Consulta KORA antes de cada cita',
    descripcion:
      'Antes de ver a tu paciente, abre su perfil en KORA. Verás un resumen IA con los últimos 30 días: presión, medicamento, síntomas y alertas.',
    detalle: 'El resumen tarda ~5 segundos en generarse.',
    accion: {
      texto: 'Ver mi dashboard',
      href: '/medico/dashboard',
      externo: false,
    },
  },
]

const MENSAJE_PACIENTE = `Hola! Te comparto KORA, la app que uso para seguirte entre consultas 🩺

1. Abre kora.app en tu celular
2. Crea una cuenta (rol "Paciente")
3. En tu perfil → "Vincular médico" → escribe mi código: [TU-CÓDIGO-AQUÍ]

Desde ahí podrás registrar cómo te sientes cada día. ¡Gracias!`

export default function OnboardingMedicoPage() {
  const [copiado, setCopiado] = useState(false)
  const [pasoActivo, setPasoActivo] = useState<number | null>(null)

  function copiarMensaje() {
    navigator.clipboard.writeText(MENSAJE_PACIENTE)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#0d3d7a] text-white py-10 px-5">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-4 py-1.5 text-sm font-medium mb-4">
            <Stethoscope size={15} />
            Guía de inicio para médicos
          </div>
          <h1 className="text-3xl font-bold mb-2">Bienvenido a KORA</h1>
          <p className="text-blue-200 text-base max-w-sm mx-auto">
            En 4 pasos tendrás tu primer paciente monitoreado. Tarda menos de 10 minutos.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {/* Pasos */}
        {PASOS.map((paso) => {
          const Icono = paso.icono
          const abierto = pasoActivo === paso.numero
          return (
            <div
              key={paso.numero}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setPasoActivo(abierto ? null : paso.numero)}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${paso.color}`}>
                  <Icono size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                      Paso {paso.numero}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">
                    {paso.titulo}
                  </h2>
                </div>
                <ChevronRight
                  size={20}
                  className={`text-gray-400 shrink-0 transition-transform ${abierto ? 'rotate-90' : ''}`}
                />
              </button>

              {abierto && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-gray-600 text-base">{paso.descripcion}</p>
                  <p className="text-sm text-gray-400 flex items-center gap-1.5">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    {paso.detalle}
                  </p>
                  {paso.accion && paso.accion.href !== '#mensaje-paciente' && (
                    <Link
                      href={paso.accion.href}
                      className="inline-flex items-center gap-2 bg-[#0d3d7a] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0b3268] transition-colors mt-1"
                    >
                      {paso.accion.texto}
                      <ChevronRight size={15} />
                    </Link>
                  )}
                  {paso.accion?.href === '#mensaje-paciente' && (
                    <button
                      onClick={copiarMensaje}
                      className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors mt-1"
                    >
                      {copiado ? <CheckCircle size={15} /> : <Copy size={15} />}
                      {copiado ? '¡Copiado!' : paso.accion.texto}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Mensaje para pacientes */}
        <div id="mensaje-paciente" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Smartphone size={18} className="text-[#0d3d7a]" />
            Mensaje para tus pacientes (WhatsApp)
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            Cópialo y cambia [TU-CÓDIGO-AQUÍ] por tu código real.
          </p>
          <div className="bg-[#f0f7ff] rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
            {MENSAJE_PACIENTE}
          </div>
          <button
            onClick={copiarMensaje}
            className="mt-3 flex items-center gap-2 bg-[#0d3d7a] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#0b3268] transition-colors"
          >
            {copiado ? <CheckCircle size={15} /> : <Copy size={15} />}
            {copiado ? '¡Copiado!' : 'Copiar mensaje'}
          </button>
        </div>

        {/* CTA final */}
        <div className="bg-gradient-to-br from-[#0d3d7a] to-[#1a56a4] rounded-2xl p-6 text-white text-center">
          <p className="text-lg font-bold mb-1">¿Listo para empezar?</p>
          <p className="text-blue-200 text-sm mb-4">
            Únete al piloto gratuito de KORA. Sin costo, sin tarjeta.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-[#0d3d7a] font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-colors"
          >
            Crear mi cuenta de médico
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#0d3d7a] font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </main>
    </div>
  )
}