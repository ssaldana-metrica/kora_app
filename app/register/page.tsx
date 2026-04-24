'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Registrar() {
  const supabase = createClient()
  const router = useRouter()

  const [paso, setPaso] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [guardando, setGuardando] = useState(false)
  const [listo, setListo] = useState(false)

  const TOTAL_PASOS = 6

  // ── Guardar en Supabase ────────────────────────────────────────────────────

  async function guardar() {
    setGuardando(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    await supabase.from('registros').insert({
      user_id: user.id,
      bienestar_general: form.bienestar_general,
      tomo_medicamento: form.tomo_medicamento,
      hora_medicamento: form.hora_medicamento || null,
      dolor_cabeza: form.dolor_cabeza,
      mareos: form.mareos,
      hinchazon: form.hinchazon,
      presion_sistolica: form.presion_sistolica ? parseInt(form.presion_sistolica) : null,
      presion_diastolica: form.presion_diastolica ? parseInt(form.presion_diastolica) : null,
      pulso: form.pulso ? parseInt(form.pulso) : null,
      notas: form.notas || null,
    })

    setGuardando(false)
    setListo(true)
  }

  // ── Navegación ─────────────────────────────────────────────────────────────

  function siguiente() {
    if (paso < TOTAL_PASOS) setPaso(paso + 1)
    else guardar()
  }

  function atras() {
    if (paso > 1) setPaso(paso - 1)
    else router.push('/paciente/dashboard')
  }

  // ── Pantalla final ─────────────────────────────────────────────────────────

  if (listo) {
    return (
      <div className="min-h-screen bg-[#f8faff] flex flex-col items-center justify-center px-6 text-center">
        <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 max-w-sm w-full">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="text-green-500" size={40} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Listo! 🎉</h1>
          <p className="text-lg text-gray-500 mb-8">
            Tu médico podrá ver cómo estuviste hoy.
          </p>
          <button
            onClick={() => router.push('/paciente/dashboard')}
            className="w-full bg-[#1a56a4] text-white text-xl font-bold py-4 rounded-2xl active:scale-95 transition-transform"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // ── Layout principal ───────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8faff] flex flex-col">

      {/* Header con progreso */}
      <header className="bg-white px-5 pt-12 pb-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={atras} className="text-gray-400 active:scale-90 transition-transform">
            <ChevronLeft size={28} />
          </button>
          <h1 className="text-xl font-bold text-gray-700">¿Cómo estás hoy?</h1>
        </div>
        {/* Barra de progreso */}
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_PASOS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                i + 1 <= paso ? 'bg-[#1a56a4]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-gray-400 mt-2">Paso {paso} de {TOTAL_PASOS}</p>
      </header>

      {/* Contenido del paso */}
      <main className="flex-1 px-5 pt-8 pb-4 max-w-lg mx-auto w-full">
        {paso === 1 && <Paso1 form={form} setForm={setForm} />}
        {paso === 2 && <Paso2 form={form} setForm={setForm} />}
        {paso === 3 && <Paso3 form={form} setForm={setForm} />}
        {paso === 4 && <Paso4 form={form} setForm={setForm} />}
        {paso === 5 && <Paso5 form={form} setForm={setForm} />}
        {paso === 6 && <Paso6 form={form} setForm={setForm} />}
      </main>

      {/* Botón siguiente */}
      <div className="px-5 pb-10 max-w-lg mx-auto w-full">
        <button
          onClick={siguiente}
          disabled={guardando}
          className="w-full bg-[#1a56a4] hover:bg-[#154a8a] active:scale-95 transition-all text-white text-xl font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : paso === TOTAL_PASOS ? 'Finalizar ✓' : (
            <>Siguiente <ChevronRight size={22} /></>
          )}
        </button>
        {paso < TOTAL_PASOS && (
          <button
            onClick={siguiente}
            className="w-full text-center text-gray-400 text-base mt-3 py-2"
          >
            Saltar este paso
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Paso 1: Bienestar general ────────────────────────────────────────────────

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
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        ¿Cómo te sientes hoy en general?
      </h2>
      <p className="text-base text-gray-400 mb-8">Toca el emoji que mejor te represente</p>
      <div className="flex justify-between gap-2">
        {opciones.map(({ valor, emoji, label }) => (
          <button
            key={valor}
            onClick={() => setForm({ ...form, bienestar_general: valor })}
            className={`flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all active:scale-95 ${
              form.bienestar_general === valor
                ? 'border-[#1a56a4] bg-[#e8f0fc] scale-105'
                : 'border-gray-200 bg-white'
            }`}
          >
            <span className="text-3xl">{emoji}</span>
            <span className="text-xs text-gray-500 font-medium leading-tight text-center">{label}</span>
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
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        ¿Tomaste tu medicamento hoy?
      </h2>
      <p className="text-base text-gray-400 mb-8">Sé honesto, tu médico te ayuda mejor así 💙</p>
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setForm({ ...form, tomo_medicamento: true })}
          className={`flex-1 py-6 rounded-2xl border-2 text-xl font-bold transition-all active:scale-95 ${
            form.tomo_medicamento === true
              ? 'bg-green-500 border-green-500 text-white scale-105'
              : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          ✅ Sí
        </button>
        <button
          onClick={() => setForm({ ...form, tomo_medicamento: false })}
          className={`flex-1 py-6 rounded-2xl border-2 text-xl font-bold transition-all active:scale-95 ${
            form.tomo_medicamento === false
              ? 'bg-red-400 border-red-400 text-white scale-105'
              : 'bg-white border-gray-200 text-gray-700'
          }`}
        >
          ❌ No
        </button>
      </div>
      {form.tomo_medicamento === true && (
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <label className="text-base font-semibold text-gray-600 block mb-2">
            ¿A qué hora lo tomaste? (opcional)
          </label>
          <input
            type="time"
            value={form.hora_medicamento}
            onChange={(e) => setForm({ ...form, hora_medicamento: e.target.value })}
            className="w-full text-xl border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#1a56a4]"
          />
        </div>
      )}
    </div>
  )
}

// ─── Paso 3: Dolor de cabeza ──────────────────────────────────────────────────

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
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        ¿Tuviste dolor de cabeza?
      </h2>
      <p className="text-base text-gray-400 mb-8">Selecciona la intensidad</p>
      <div className="flex flex-col gap-3">
        {opciones.map(({ valor, label }) => (
          <button
            key={valor}
            onClick={() => setForm({ ...form, dolor_cabeza: valor })}
            className={`w-full py-4 rounded-2xl border-2 text-lg font-semibold text-left px-5 transition-all active:scale-95 ${
              form.dolor_cabeza === valor
                ? 'border-[#1a56a4] bg-[#e8f0fc] text-[#1a56a4]'
                : 'border-gray-200 bg-white text-gray-700'
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
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        ¿Sentiste mareos o hinchazón?
      </h2>
      <p className="text-base text-gray-400 mb-8">Puedes marcar ambas si aplica</p>
      <div className="flex flex-col gap-4">
        <button
          onClick={() => setForm({ ...form, mareos: !form.mareos })}
          className={`w-full py-5 rounded-2xl border-2 text-xl font-semibold flex items-center gap-4 px-6 transition-all active:scale-95 ${
            form.mareos
              ? 'border-[#1a56a4] bg-[#e8f0fc] text-[#1a56a4]'
              : 'border-gray-200 bg-white text-gray-700'
          }`}
        >
          <span className="text-3xl">🌀</span>
          <span>Mareos</span>
          {form.mareos && <Check className="ml-auto text-[#1a56a4]" size={24} />}
        </button>
        <button
          onClick={() => setForm({ ...form, hinchazon: !form.hinchazon })}
          className={`w-full py-5 rounded-2xl border-2 text-xl font-semibold flex items-center gap-4 px-6 transition-all active:scale-95 ${
            form.hinchazon
              ? 'border-[#1a56a4] bg-[#e8f0fc] text-[#1a56a4]'
              : 'border-gray-200 bg-white text-gray-700'
          }`}
        >
          <span className="text-3xl">🫧</span>
          <span>Hinchazón</span>
          {form.hinchazon && <Check className="ml-auto text-[#1a56a4]" size={24} />}
        </button>
        <button
          onClick={() => setForm({ ...form, mareos: false, hinchazon: false })}
          className={`w-full py-5 rounded-2xl border-2 text-xl font-semibold flex items-center gap-4 px-6 transition-all active:scale-95 ${
            !form.mareos && !form.hinchazon
              ? 'border-[#1a56a4] bg-[#e8f0fc] text-[#1a56a4]'
              : 'border-gray-200 bg-white text-gray-700'
          }`}
        >
          <span className="text-3xl">✓</span>
          <span>Ninguno</span>
        </button>
      </div>
    </div>
  )
}

// ─── Paso 5: Presión arterial ─────────────────────────────────────────────────

function Paso5({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        ¿Cómo estuvo tu presión arterial?
      </h2>
      <p className="text-base text-gray-400 mb-8">
        Si no te la mediste, puedes saltar este paso 👆
      </p>
      <div className="flex flex-col gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <label className="text-base font-semibold text-gray-600 block mb-2">
            Sistólica (número de arriba)
          </label>
          <input
            type="number"
            placeholder="ej: 120"
            value={form.presion_sistolica}
            onChange={(e) => setForm({ ...form, presion_sistolica: e.target.value })}
            className="w-full text-2xl font-bold border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#1a56a4]"
          />
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <label className="text-base font-semibold text-gray-600 block mb-2">
            Diastólica (número de abajo)
          </label>
          <input
            type="number"
            placeholder="ej: 80"
            value={form.presion_diastolica}
            onChange={(e) => setForm({ ...form, presion_diastolica: e.target.value })}
            className="w-full text-2xl font-bold border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#1a56a4]"
          />
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <label className="text-base font-semibold text-gray-600 block mb-2">
            Pulso (pulsaciones por minuto)
          </label>
          <input
            type="number"
            placeholder="ej: 72"
            value={form.pulso}
            onChange={(e) => setForm({ ...form, pulso: e.target.value })}
            className="w-full text-2xl font-bold border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#1a56a4]"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Paso 6: Notas libres ─────────────────────────────────────────────────────

function Paso6({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-2">
        ¿Algo más que quieras anotar?
      </h2>
      <p className="text-base text-gray-400 mb-8">
        Cualquier cosa que quieras que tu médico sepa — es opcional 😊
      </p>
      <textarea
        value={form.notas}
        onChange={(e) => setForm({ ...form, notas: e.target.value })}
        placeholder="Ej: Me sentí cansada después del almuerzo, dormí mal..."
        rows={6}
        className="w-full text-lg border border-gray-200 rounded-2xl px-5 py-4 focus:outline-none focus:border-[#1a56a4] bg-white resize-none"
      />
    </div>
  )
}