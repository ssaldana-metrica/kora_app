'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Camera,
  ImageIcon,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

interface MedicamentoPendiente {
  nombre: string
  dosis: string
  frecuencia_horas: number
  duracion_dias: number | null
  instrucciones_especiales: string | null
}

export default function RecetaPage() {
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const galeriaRef = useRef<HTMLInputElement>(null)

  const [userId, setUserId] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [medicamentos, setMedicamentos] = useState<MedicamentoPendiente[]>([])
  const [error, setError] = useState('')
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      else setUserId(user.id)
    })
  }, [])

  async function handleFile(file: File) {
    if (!userId) return
    setError('')
    setProcesando(true)
    setMedicamentos([])

    try {
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${Date.now()}.${ext}`

      const { error: uploadErr } = await supabase.storage.from('documentos').upload(path, file)
      if (uploadErr) throw new Error('Error subiendo imagen')

      const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path)

      const { data: doc } = await supabase
        .from('documentos')
        .insert({ paciente_id: userId, nombre_archivo: file.name, tipo: 'receta', url: urlData.publicUrl })
        .select()
        .single()

      const res = await fetch('/api/recetas/procesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentoId: doc?.id, imageUrl: urlData.publicUrl }),
      })
      const data = await res.json()

      if (data.error === 'no_parece_receta') {
        setError('Esta imagen no parece ser una receta médica. Por favor, toma una foto de tu receta.')
        return
      }

      if (!data.medicamentos?.length) {
        setError('No pudimos leer los medicamentos. Intenta con una foto más nítida.')
        return
      }

      setMedicamentos(data.medicamentos.map((m: { nombre: string; dosis: string; frecuencia_horas: number; duracion_dias: number | null; instrucciones_especiales: string | null }) => ({
        nombre: m.nombre,
        dosis: m.dosis,
        frecuencia_horas: m.frecuencia_horas,
        duracion_dias: m.duracion_dias,
        instrucciones_especiales: m.instrucciones_especiales,
      })))
    } catch {
      setError('Ocurrió un error. Intenta de nuevo.')
    } finally {
      setProcesando(false)
    }
  }

  async function confirmar() {
    setConfirming(true)
    try {
      await fetch('/api/recetas/confirmar', { method: 'POST' })
      router.push('/paciente/dashboard')
    } finally {
      setConfirming(false)
    }
  }

  function eliminar(idx: number) {
    setMedicamentos(prev => prev.filter((_, i) => i !== idx))
  }

  function actualizarCampo(idx: number, campo: keyof MedicamentoPendiente, valor: string | number | null) {
    setMedicamentos(prev => prev.map((m, i) => i === idx ? { ...m, [campo]: valor } : m))
  }

  return (
    <div className="min-h-screen bg-[#f8faff] pb-8">
      <header className="bg-white px-4 pt-12 pb-5 shadow-sm flex items-center gap-3">
        <Link href="/paciente/documentos" className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors">
          <ArrowLeft size={20} className="text-gray-700" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Fotografiar receta</h1>
          <p className="text-sm text-gray-400">KORA leerá tus medicamentos automáticamente</p>
        </div>
      </header>

      <main className="px-4 pt-6 flex flex-col gap-5 max-w-lg mx-auto">

        {/* Estado: inicial o procesando */}
        {!procesando && medicamentos.length === 0 && (
          <>
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 bg-[#e8f0fc] rounded-full flex items-center justify-center mx-auto mb-5">
                <Camera className="text-[#1a56a4]" size={40} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Toma una foto de tu receta</h2>
              <p className="text-base text-gray-400 mb-7">
                Apunta la cámara a la receta de tu médico y KORA extraerá automáticamente tus medicamentos con sus horarios.
              </p>

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />
              <input
                ref={galeriaRef}
                type="file"
                accept="image/*"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
              />

              <button
                onClick={() => fileRef.current?.click()}
                className="w-full bg-[#1a56a4] text-white text-xl font-bold py-5 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform shadow-md mb-3"
              >
                <Camera size={28} />
                Tomar foto
              </button>

              <button
                onClick={() => galeriaRef.current?.click()}
                className="w-full bg-white border-2 border-[#1a56a4] text-[#1a56a4] text-lg font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                <ImageIcon size={22} />
                Subir desde galería
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={() => { setError(''); fileRef.current?.click() }}
                  className="mt-3 text-sm text-red-500 underline"
                >
                  Intentar de nuevo
                </button>
              </div>
            )}
          </>
        )}

        {/* Procesando */}
        {procesando && (
          <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 text-center">
            <Loader2 size={48} className="animate-spin text-[#1a56a4] mx-auto mb-5" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">KORA está leyendo tu receta…</h2>
            <p className="text-base text-gray-400">Puede tardar 10–15 segundos</p>
          </div>
        )}

        {/* Medicamentos detectados */}
        {medicamentos.length > 0 && (
          <>
            <div className="bg-[#e8f0fc] rounded-2xl p-4 flex items-center gap-3 border border-[#1a56a4]/20">
              <CheckCircle2 className="text-[#1a56a4] shrink-0" size={22} />
              <div>
                <p className="text-[#1a56a4] font-semibold">
                  KORA encontró {medicamentos.length} medicamento{medicamentos.length > 1 ? 's' : ''}. Revisa y corrige si hace falta.
                </p>
                <p className="text-[#1a56a4]/70 text-sm mt-1">
                  La lectura es automática (IA): revisa que todo esté correcto antes de confirmar.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {medicamentos.map((med, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                  {editandoIdx === idx ? (
                    <div className="flex flex-col gap-3">
                      <input
                        className="border border-gray-200 rounded-xl px-3 py-2 text-base font-semibold"
                        value={med.nombre}
                        onChange={e => actualizarCampo(idx, 'nombre', e.target.value)}
                        placeholder="Nombre del medicamento"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          value={med.dosis}
                          onChange={e => actualizarCampo(idx, 'dosis', e.target.value)}
                          placeholder="Dosis (ej: 500mg)"
                        />
                        <input
                          type="number"
                          className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                          value={med.frecuencia_horas}
                          onChange={e => actualizarCampo(idx, 'frecuencia_horas', Number(e.target.value))}
                          placeholder="Cada X horas"
                        />
                      </div>
                      <input
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm"
                        value={med.instrucciones_especiales ?? ''}
                        onChange={e => actualizarCampo(idx, 'instrucciones_especiales', e.target.value || null)}
                        placeholder="Instrucciones especiales (opcional)"
                      />
                      <button
                        onClick={() => setEditandoIdx(null)}
                        className="bg-[#1a56a4] text-white py-2 rounded-xl text-sm font-semibold"
                      >
                        Listo
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-lg font-bold text-gray-800">{med.nombre}</p>
                        <p className="text-sm text-gray-500 mt-0.5">{med.dosis}</p>
                        <p className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                          <Clock size={13} />
                          Cada {med.frecuencia_horas}h
                          {med.duracion_dias && ` · ${med.duracion_dias} días`}
                        </p>
                        {med.instrucciones_especiales && (
                          <p className="text-xs text-[#1a56a4] mt-1">ℹ️ {med.instrucciones_especiales}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => setEditandoIdx(idx)}
                          className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <Pencil size={15} className="text-gray-500" />
                        </button>
                        <button
                          onClick={() => eliminar(idx)}
                          className="p-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={15} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={confirmar}
              disabled={confirming || medicamentos.length === 0}
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white text-xl font-bold py-5 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-md disabled:opacity-50"
            >
              <CheckCircle2 size={26} />
              {confirming ? 'Guardando...' : 'Confirmar mi plan de medicación'}
            </button>

            <button
              onClick={() => { setMedicamentos([]); setError('') }}
              className="w-full text-center text-sm text-gray-400 py-2 underline"
            >
              Volver a fotografiar
            </button>
          </>
        )}
      </main>
    </div>
  )
}
