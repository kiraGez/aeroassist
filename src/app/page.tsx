'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, User, Settings, LogOut, Plane } from 'lucide-react'
import { 
  ChatMessage, 
  ChatInput, 
  TypingIndicator, 
  WelcomeMessage,
  type Message 
} from '@/components/chat'
import { AdminDashboard } from '@/components/admin'
import { SourceViewer } from '@/components/source-viewer'
import { cn } from '@/lib/utils'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [sourcePage, setSourcePage] = useState<number | null>(null)
  const [sourceDocument, setSourceDocument] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userName, setUserName] = useState('Guest')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Check admin status on mount
    // In production, this would check Supabase auth
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setUserName(user.name || 'Guest')
      setIsAdmin(user.role === 'admin')
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (query: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          history: messages.map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        citations: data.citations
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleCitationClick = (page: number, document: string) => {
    setSourcePage(page)
    setSourceDocument(document)
    setShowSource(true)
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Plane className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AeroAssist</h1>
              <p className="text-xs text-slate-400">Flight Operations AI</p>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="p-4">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-slate-200">Knowledge Base</span>
            </div>
            <p className="text-xs text-slate-400">Connected to Global Library</p>
          </div>
        </div>

        {/* Admin Button */}
        {isAdmin && (
          <div className="px-4">
            <button
              onClick={() => setShowAdmin(true)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-rose-600/20 text-rose-400 rounded-xl hover:bg-rose-600/30 transition"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Admin Dashboard</span>
            </button>
          </div>
        )}

        {/* User Section */}
        <div className="mt-auto p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{userName}</p>
              <p className="text-xs text-slate-400">{isAdmin ? 'Administrator' : 'Pilot'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-slate-800">AI Instructor</span>
          </div>
          <div className="text-sm text-slate-500">
            Powered by GPT-4o + Vector Search
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <WelcomeMessage />
          ) : (
            <div className="py-4">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onCitationClick={handleCitationClick}
                />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
        </div>
      </main>

      {/* Modals */}
      <AdminDashboard isOpen={showAdmin} onClose={() => setShowAdmin(false)} />
      <SourceViewer
        isOpen={showSource}
        onClose={() => setShowSource(false)}
        page={sourcePage}
        document={sourceDocument}
      />
    </div>
  )
}
