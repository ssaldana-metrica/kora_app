'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { trackEvent } from '@/lib/tracking'

export const dynamic = 'force-dynamic'

interface FormData {
  bienestar_general: number | null
  tomo_medicamento: boolean | null
  hora_medicamento: string
  dolor_cabeza: number | null
  mareos: boolean
  hinchazon: boolean
  presion_sistolica: string
  presion_diastolica: string
  pulso: string
  notas: string
}

const INITIAL: FormData = {
  bienestar_general: null,
  tomo_medicamento: null,
  hora_medicamento: '',
  dolor_cabeza: null,
  mareos: false,
  hinchazon: false,
  presion_sistolica: '',
  presion_diastolica: '',
  pulso: '',
  notas: '',
}

export default function Registrar() {
  const supabase = createClient()
  const router = useRouter()

  const [paso, setPaso] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [guardando, setGuardando] = useState(false)
  const [listo, setListo] = useState(false)

  const TOTAL_PASOS = 6

  async function guardar() {
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error } = await supabase.from('registros').insert({
      paciente_id: user.id,          // ✅ columna correcta
      user_id: user.id,
      bienestar_general: form.bienestar_general ?? 3,
      tomo_medicamento: form.tomo_medicamento, // ✅ nombre correcto
      hora_medicamento: form.hora_medicamento || null,
      dolor_cabeza: form.dolor_cabeza,
      mareos: form.mareos,
      hinchazon: form.hinchazon,
      presion_sistolica: form.presion_sistolica ? parseInt(form.presion_sistolica) : null,
      presion_diastolica: form.presion_diastolica ? parseInt(form.presion_diastolica) : null,
      pulso: form.pulso ? parseInt(form.pulso) : null,
      notas: form.notas || null,
    })

    if (error) {
      console.error('Error guardando registro:', error)
      alert('Error al guardar. Intenta de nuevo.')
      setGuardando(false)
      return
    }

    await trackEvent('registro_completado', { userId: user.id })
    setGuardando(false)
    setListo(true)
  }

  function siguiente() {
    if (paso < TOTAL_PASOS) setPaso(paso + 1)
    else guardar()
  }

  function atras() {
    if (paso > 1) setPaso(paso - 1)
    else router.push('/paciente/dashboard')
  }

  if (listo) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex flex-col items-center justify-center px-6 text-center">
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-[#E5EAF0] max-w-sm w-full">
          <div className="w-20 h-20 bg-[#E6F4F4] rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="text-[#0E9594]" size={40} strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-bold text-[#0E1B2A] mb-2">¡Listo!</h1>
          <p className="text-base text-[#5B6B7C] mb-8">
            Tu médico podrá ver cómo estuviste hoy.
          </p>
          <button
            onClick={() => router.push('/paciente/dashboard')}
            className="w-full bg-[#0B2A4A] text-white text-xl font-bold py-4 rounded-[20px] active:scale-95 transition-transform"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col">
      <header className="bg-white px-5 pt-12 pb-5 shadow-sm">
        <div className="flex items-center gap-4 mb-5">
          <button
            onClick={atras}
            className="text-[#0B2A4A] active:scale-90 transition-transform"
          >
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-xl font-bold text-[#0E1B2A]">¿Cómo estás hoy?</h1>
        </div>
        <div className="flex gap-2 items-center mb-2">
          {Array.from({ length: TOTAL_PASOS }).map((_, i) => {
            const isCompleted = i + 1 < paso
            const isCurrent = i + 1 === paso
            return (
              <div
                key={i}
                className={`transition-all duration-300 rounded-full ${
                  isCompleted
                    ? 'w-3 h-3 bg-[#0B2A4A]'
                    : isCurrent
                    ? 'w-3 h-3 bg-[#0E9594]'
                    : 'w-3 h-3 bg-[#E5EAF0]'
                }`}
              />
            )
          })}
          <span className="ml-2 text-sm text-[#5B6B7C]">Paso {paso} de {TOTAL_PASOS}</span>
        </div>
      </header>

      <main className="flex-1 px-5 pt-8 pb-4 max-w-lg mx-auto w-full">
        {paso === 1 && <Paso1 form={form} setForm={setForm} />}
        {paso === 2 && <Paso2 form={form} setForm={setForm} />}
        {paso === 3 && <Paso3 form={form} setForm={setForm} />}
        {paso === 4 && <Paso4 form={form} setForm={setForm} />}
        {paso === 5 && <Paso5 form={form} setForm={setForm} />}
        {paso === 6 && <Paso6 form={form} setForm={setForm} />}
      </main>

      <div className="px-5 pb-10 max-w-lg mx-auto w-full">
        <button
          onClick={siguiente}
          disabled={guardando}
          className={`w-full text-white text-xl font-bold py-4 rounded-[20px] flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60 ${
            paso === TOTAL_PASOS
              ? 'bg-[#16A571]'
              : 'bg-[#0E9594]'
          }`}
        >
          {guardando
            ? 'Guardando…'
            : paso === TOTAL_PASOS
            ? 'Finalizar ✓'
            : <><span>Siguiente</span><ChevronRight size={22} /></>
          }
        </button>
        {paso < TOTAL_PASOS && (
          <button
            onClick={siguiente}
            className="w-full text-center text-[#5B6B7C] underline text-sm mt-3 py-2"
          >
            Saltar este paso
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Paso 1: Bienestar ────────────────────────────────────────────────────────

function Paso1({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const opciones = [
    { valor: 1, emoji: '😔', label: 'Muy mal' },
    { valor: 2, emoji: '😕', label: 'Mal' },
    { valor: 3, emoji: '😐', label: 'Regular' },
    { valor: 4, emoji: '🙂', label: 'Bien' },
    { valor: 5, emoji: '😊', label: 'Muy bien' },
  ]
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0E1B2A] mb-2">¿Cómo te sientes hoy en general?</h2>
      <p className="text-base text-[#5B6B7C] mb-8">Toca el emoji que mejor te represente</p>
      <div className="flex justify-between gap-2">
        {opciones.map(({ valor, emoji, label }) => (
          <button
            key={valor}
            onClick={() => setForm({ ...form, bienestar_general: valor })}
            className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-[16px] border-2 transition-all active:scale-95 ${
              form.bienestar_general === valor
                ? 'border-[#0E9594] bg-[#E6F4F4] text-[#0B2A4A] scale-105'
                : 'border-[#E5EAF0] bg-white text-[#0E1B2A]'
            }`}
          >
            <span className="text-3xl">{emoji}</span>
            <span className="text-xs font-medium leading-tight text-center">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Paso 2: Medicamento ──────────────────────────────────────────────────────

function Paso2({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0E1B2A] mb-2">¿Tomaste tu medicamento hoy?</h2>
      <p className="text-base text-[#5B6B7C] mb-8">Sé honesto, tu médico te ayuda mejor así</p>
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setForm({ ...form, tomo_medicamento: true })}
          className={`flex-1 py-6 rounded-[16px] border-2 text-xl font-bold transition-all active:scale-95 ${
            form.tomo_medicamento === true
              ? 'bg-[#16A571] border-[#16A571] text-white scale-105'
              : 'bg-white border-[#E5EAF0] text-[#0E1B2A]'
          }`}
        >
          Sí
        </button>
        <button
          onClick={() => setForm({ ...form, tomo_medicamento: false })}
          className={`flex-1 py-6 rounded-[16px] border-2 text-xl font-bold transition-all active:scale-95 ${
            form.tomo_medicamento === false
              ? 'bg-[#E0533D] border-[#E0533D] text-white scale-105'
              : 'bg-white border-[#E5EAF0] text-[#0E1B2A]'
          }`}
        >
          No
        </button>
      </div>
      {form.tomo_medicamento === true && (
        <div className="bg-white rounded-[16px] p-4 border border-[#E5EAF0]">
          <label className="text-base font-semibold text-[#5B6B7C] block mb-2">¿A qué hora? (opcional)</label>
          <input
            type="time"
            value={form.hora_medicamento}
            onChange={(e) => setForm({ ...form, hora_medicamento: e.target.value })}
            className="w-full text-xl border border-[#E5EAF0] rounded-[16px] px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#0E9594]"
          />
        </div>
      )}
    </div>
  )
}

// ─── Paso 3: Dolor cabeza ─────────────────────────────────────────────────────

function Paso3({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const opciones = [
    { valor: 0, label: 'No tuve' },
    { valor: 1, label: 'Leve' },
    { valor: 2, label: 'Moderado' },
    { valor: 3, label: 'Fuerte' },
    { valor: 4, label: 'Muy fuerte' },
  ]
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0E1B2A] mb-2">¿Tuviste dolor de cabeza?</h2>
      <p className="text-base text-[#5B6B7C] mb-8">Selecciona la intensidad</p>
      <div className="flex flex-col gap-3">
        {opciones.map(({ valor, label }) => (
          <button
            key={valor}
            onClick={() => setForm({ ...form, dolor_cabeza: valor })}
            className={`w-full py-4 rounded-[16px] border-2 text-lg font-semibold text-left px-5 transition-all active:scale-95 ${
              form.dolor_cabeza === valor
                ? 'border-[#0E9594] bg-[#E6F4F4] text-[#0B2A4A]'
                : 'border-[#E5EAF0] bg-white text-[#0E1B2A]'
            }`}
          >
            {valor === 0 ? '✓ ' : `${valor}. `}{label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Paso 4: Mareos / hinchazón ───────────────────────────────────────────────

function Paso4({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0E1B2A] mb-2">¿Sentiste mareos o hinchazón?</h2>
      <p className="text-base text-[#5B6B7C] mb-8">Puedes marcar ambas si aplica</p>
      <div className="flex flex-col gap-4">
        {[
          { campo: 'mareos' as const, emoji: '🌀', label: 'Mareos' },
          { campo: 'hinchazon' as const, emoji: '🫧', label: 'Hinchazón' },
        ].map(({ campo, emoji, label }) => (
          <button
            key={campo}
            onClick={() => setForm({ ...form, [campo]: !form[campo] })}
            className={`w-full py-5 rounded-[16px] border-2 text-xl font-semibold flex items-center gap-4 px-6 transition-all active:scale-95 ${
              form[campo]
                ? 'border-[#0E9594] bg-[#E6F4F4] text-[#0B2A4A]'
                : 'border-[#E5EAF0] bg-white text-[#0E1B2A]'
            }`}
          >
            <span className="text-3xl">{emoji}</span>
            <span>{label}</span>
            {form[campo] && <Check className="ml-auto text-[#0E9594]" size={24} />}
          </button>
        ))}
        <button
          onClick={() => setForm({ ...form, mareos: false, hinchazon: false })}
          className={`w-full py-5 rounded-[16px] border-2 text-xl font-semibold flex items-center gap-4 px-6 transition-all active:scale-95 ${
            !form.mareos && !form.hinchazon
              ? 'border-[#0E9594] bg-[#E6F4F4] text-[#0B2A4A]'
              : 'border-[#E5EAF0] bg-white text-[#0E1B2A]'
          }`}
        >
          <span className="text-3xl">✓</span>
          <span>Ninguno</span>
        </button>
      </div>
    </div>
  )
}

// ─── Paso 5: Presión ──────────────────────────────────────────────────────────

function Paso5({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0E1B2A] mb-2">¿Cómo estuvo tu presión arterial?</h2>
      <p className="text-base text-[#5B6B7C] mb-8">Si no te la mediste, puedes saltar este paso</p>
      <div className="flex flex-col gap-4">
        {[
          { campo: 'presion_sistolica' as const, label: 'Sistólica (número de arriba)', placeholder: 'ej: 120' },
          { campo: 'presion_diastolica' as const, label: 'Diastólica (número de abajo)', placeholder: 'ej: 80' },
          { campo: 'pulso' as const, label: 'Pulso (pulsaciones por minuto)', placeholder: 'ej: 72' },
        ].map(({ campo, label, placeholder }) => (
          <div key={campo} className="bg-white rounded-[16px] p-5 border border-[#E5EAF0]">
            <label className="text-base font-semibold text-[#5B6B7C] block mb-2">{label}</label>
            <input
              type="number"
              placeholder={placeholder}
              value={form[campo]}
              onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
              className="w-full text-2xl font-bold border border-[#E5EAF0] rounded-[16px] px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#0E9594]"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Paso 6: Notas ────────────────────────────────────────────────────────────

function Paso6({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#0E1B2A] mb-2">¿Algo más que quieras anotar?</h2>
      <p className="text-base text-[#5B6B7C] mb-8">Cualquier cosa que quieras que tu médico sepa — es opcional</p>
      <textarea
        value={form.notas}
        onChange={(e) => setForm({ ...form, notas: e.target.value })}
        placeholder="Ej: Me sentí cansada después del almuerzo, dormí mal..."
        rows={6}
        className="w-full text-lg border border-[#E5EAF0] rounded-[16px] px-5 py-4 bg-white focus:outline-none focus:ring-2 focus:ring-[#0E9594] resize-none"
      />
    </div>
  )
}
