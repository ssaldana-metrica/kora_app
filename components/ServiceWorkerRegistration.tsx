'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('KORA SW registrado:', registration.scope)
        })
        .catch((error) => {
          console.log('SW error:', error)
        })
    }
  }, [])

  return null
}