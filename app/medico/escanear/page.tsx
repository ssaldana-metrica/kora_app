'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function EscanearQR() {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    async function iniciarScanner() {
      const { Html5QrcodeScanner } = await import('html5-qrcode')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scanner: any = new Html5QrcodeScanner(
        'qr-reader',
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      )
      scanner.render(
        (decodedText: string) => {
          try {
            const url = new URL(decodedText)
            const pacienteId = url.searchParams.get('paciente_id')
            if (pacienteId) {
              scanner.clear()
              router.push(`/medico/vincular?paciente_id=${pacienteId}`)
            }
          } catch {
            // not a valid URL, continue scanning
          }
        },
        () => { /* ignore errors */ }
      )
      scannerRef.current = scanner
    }

    iniciarScanner()
    return () => { scannerRef.current?.clear() }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0d3d7a] text-white px-4 py-4 flex items-center gap-3">
        <Link href="/medico/dashboard" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="font-bold text-lg">Escanear QR del paciente</h1>
          <p className="text-blue-200 text-sm">Apunta al código QR del paciente</p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div id="qr-reader" />
        </div>
        <p className="text-center text-sm text-gray-400 mt-4">
          El paciente debe mostrar su QR desde su perfil en KORA
        </p>
      </main>
    </div>
  )
}
