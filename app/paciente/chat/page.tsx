'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, Send, Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTED_PROMPTS = [
  '¿Cuándo tomo mi medicamento?',
  '¿Qué significa hemoglobina glicosilada?',
  'Ayúdame a preparar mis preguntas para el médico',
]

export default function ChatPage() {
  const supabase = createClient()
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserId(user.id)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const history = updatedMessages.slice(-10)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      })

      if (!res.ok) throw new Error('Error en la respuesta')

      const data = await res.json()
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply ?? data.message ?? 'Sin respuesta.',
      }
      setMessages((prev) => [...prev, assistantMsg])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Lo siento, hubo un error. Intenta de nuevo.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [messages, loading])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleSuggestedPrompt = (prompt: string) => {
    setInput(prompt)
    textareaRef.current?.focus()
  }

  return (
    <div className="flex flex-col h-screen bg-[#F4F7FB]">
      {/* Header */}
      <header className="bg-white px-5 pt-12 pb-5 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#F4F7FB] transition-colors"
            aria-label="Volver"
          >
            <ArrowLeft size={22} className="text-[#0B2A4A]" />
          </button>
          <div>
            <p className="text-xl font-bold text-[#0B2A4A] leading-tight">KORA</p>
            <p className="text-sm text-[#5B6B7C] leading-tight">Asistente de salud</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#0E9594] flex items-center justify-center">
          <MessageCircle size={20} className="text-white" />
        </div>
      </header>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {/* Disclaimer */}
        <div className="bg-[#E6F4F4] rounded-[12px] p-3 text-center">
          <p className="text-xs text-[#5B6B7C]">
            KORA es un asistente de apoyo. No reemplaza a tu médico.
          </p>
        </div>

        {/* Suggested prompts */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSuggestedPrompt(prompt)}
                className="bg-[#E6F4F4] text-[#0E9594] text-sm rounded-full px-3 py-1.5 hover:bg-[#d0eaea] transition-colors text-left"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={
                msg.role === 'user'
                  ? 'bg-[#0B2A4A] text-white rounded-[20px] rounded-br-[4px] px-4 py-3 text-base ml-auto max-w-[80%]'
                  : 'bg-white border border-[#E5EAF0] rounded-[20px] rounded-bl-[4px] px-4 py-3 text-base mr-auto max-w-[85%] shadow-sm text-[#0B2A4A]'
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[#E5EAF0] rounded-[20px] rounded-bl-[4px] px-4 py-3 shadow-sm flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full bg-[#0E9594] animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-[#0E9594] animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-[#0E9594] animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar — fixed above bottom of screen */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5EAF0] px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta…"
            rows={1}
            className="border border-[#E5EAF0] rounded-[20px] px-4 py-3 flex-1 bg-white text-base focus:outline-none focus:ring-2 focus:ring-[#0E9594] resize-none overflow-hidden"
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="bg-[#0E9594] rounded-full w-12 h-12 flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            aria-label="Enviar"
          >
            {loading ? (
              <Loader2 size={20} className="text-white animate-spin" />
            ) : (
              <Send size={20} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
