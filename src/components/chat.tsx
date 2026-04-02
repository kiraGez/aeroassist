'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, BookOpen, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Array<{
    page: number
    document: string
    preview: string
  }>
}

interface ChatMessageProps {
  message: Message
  onCitationClick: (page: number, document: string) => void
}

export function ChatMessage({ message, onCitationClick }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={cn(
      'flex gap-4 px-4 py-6',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      <div className={cn(
        'max-w-[80%] rounded-2xl px-4 py-3 shadow-sm',
        isUser 
          ? 'bg-blue-600 text-white rounded-br-md' 
          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
      )}>
        <div className="prose prose-sm max-w-none">
          {message.content.split('\n').map((line, i) => (
            <p key={i} className="mb-2 last:mb-0">
              {line.split(/\[(Page \d+)\]/g).map((part, j) => 
                part.match(/^Page \d+$/) ? (
                  <button
                    key={j}
                    onClick={() => onCitationClick(parseInt(part.replace('Page ', '')), 'Document')}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                  >
                    <BookOpen className="w-3 h-3 mr-1" />
                    {part}
                  </button>
                ) : (
                  <span key={j}>{part}</span>
                )
              )}
            </p>
          ))}
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
            {message.citations.map((c, i) => (
              <button
                key={i}
                onClick={() => onCitationClick(c.page, c.document)}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              >
                <BookOpen className="w-3 h-3 mr-1" />
                {c.document} p.{c.page}
              </button>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shadow-sm">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  )
}

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder = 'Ask about procedures, limitations, or say "Create a quiz"...' }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }, [input])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-2 bg-white rounded-2xl border border-slate-200 shadow-lg p-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none border-0 outline-none bg-transparent px-2 py-1.5 text-slate-800 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim()}
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all',
            input.trim() && !disabled
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  )
}

interface TypingIndicatorProps {
  message?: string
}

export function TypingIndicator({ message = 'Thinking...' }: TypingIndicatorProps) {
  return (
    <div className="flex gap-4 px-4 py-6">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
        <Bot className="w-5 h-5 text-white" />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm text-slate-500">{message}</span>
        </div>
      </div>
    </div>
  )
}

export function WelcomeMessage() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Welcome to AeroAssist</h1>
      <p className="text-slate-500 max-w-md mb-8">
        I'm your AI flight instructor, grounded in your airline's approved manuals. 
        Ask me about procedures, limitations, or request a quiz.
      </p>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <div className="bg-slate-50 rounded-xl p-4 text-left">
          <p className="text-sm font-medium text-slate-700 mb-1">Example Questions:</p>
          <ul className="text-sm text-slate-500 space-y-1">
            <li>• "What is the max crosswind for landing?"</li>
            <li>• "Engine fire procedure for B777"</li>
            <li>• "Give me a quiz on hydraulics"</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
