'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#f8faff] flex flex-col items-center justify-center px-6 text-center">
      <div className="bg-white rounded-3xl p-10 shadow-sm border border-gray-100 max-w-sm w-full">
        <p className="text-5xl mb-4">📡</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Sin conexión</h1>
        <p className="text-gray-500 mb-6">
          No tienes internet en este momento. Tus datos están guardados y se sincronizarán cuando vuelvas a conectarte.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-[#1a56a4] text-white text-lg font-bold py-3 rounded-2xl"
        >
          Reintentar
        </button>
      </div>
    </div>
  )
}