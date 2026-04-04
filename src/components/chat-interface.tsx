'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { Bot, User as UserIcon, LogOut, Plane, Upload, Plus, MessageSquare, Trash2 } from 'lucide-react'
import { ChatMessage, ChatInput, TypingIndicator, WelcomeMessage, type Message } from './chat'
import { AdminDashboard } from './admin'
import { SourceViewer } from './source-viewer'

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
  messages: { count: number }[]
}

interface ChatInterfaceProps {
  user: User
  isAdmin: boolean
  onSignOut: () => void
}

export default function ChatInterface({ user, isAdmin, onSignOut }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [sourcePage, setSourcePage] = useState<number | null>(null)
  const [sourceDocument, setSourceDocument] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations()
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/conversations')
      const data = await response.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    }
  }

  const createNewConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' })
      })
      const data = await response.json()
      if (data.conversation) {
        setCurrentConversationId(data.conversation.id)
        setMessages([])
        fetchConversations()
      }
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages?conversation_id=${conversationId}`)
      const data = await response.json()
      if (data.messages) {
        const loadedMessages: Message[] = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations
        }))
        setMessages(loadedMessages)
        setCurrentConversationId(conversationId)
      }
    } catch (error) {
      console.error('Failed to load conversation:', error)
    }
  }

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await fetch(`/api/conversations?id=${conversationId}`, { method: 'DELETE' })
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      if (currentConversationId === conversationId) {
        setCurrentConversationId(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const saveMessage = async (role: 'user' | 'assistant', content: string, citations?: any[]) => {
    if (!currentConversationId) return
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: currentConversationId,
          role,
          content,
          citations
        })
      })
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  const handleSend = async (query: string) => {
    // Create conversation if needed
    let convId = currentConversationId
    if (!convId) {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: query.slice(0, 50) + (query.length > 50 ? '...' : '') })
      })
      const data = await response.json()
      convId = data.conversation.id
      setCurrentConversationId(convId)
      fetchConversations()
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query
    }
    setMessages(prev => [...prev, userMessage])
    saveMessage('user', query)

    setIsLoading(true)
    setStreamingContent('')

    try {
      // Use streaming endpoint
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      setIsStreaming(true)
      setIsLoading(false)

      let fullContent = ''
      let citations: any[] = []

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'metadata') {
                  citations = data.citations
                } else if (data.type === 'token') {
                  fullContent += data.content
                  setStreamingContent(fullContent)
                } else if (data.type === 'done') {
                  // Finalize message
                  const assistantMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: fullContent,
                    citations
                  }
                  setMessages(prev => [...prev, assistantMessage])
                  setStreamingContent('')
                  saveMessage('assistant', fullContent, citations)
                } else if (data.type === 'error') {
                  throw new Error(data.message)
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      setIsStreaming(false)
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Please try again'}`
      }
      setMessages(prev => [...prev, errorMessage])
      setIsLoading(false)
      setIsStreaming(false)
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

        {/* New Chat Button */}
        <div className="p-4">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New Conversation</span>
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-4">
          <p className="text-xs text-slate-500 mb-2">Recent Conversations</p>
          {conversations.length === 0 ? (
            <p className="text-xs text-slate-500">No conversations yet</p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
                    currentConversationId === conv.id
                      ? 'bg-slate-700'
                      : 'hover:bg-slate-800'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span className="text-sm truncate flex-1">{conv.title}</span>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="p-1 hover:bg-slate-600 rounded"
                  >
                    <Trash2 className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status */}
        <div className="p-4">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm font-medium text-slate-200">Connected</span>
            </div>
            <p className="text-xs text-slate-400">Gemini 1.5 Flash Ready</p>
          </div>
        </div>

        {/* Admin Button */}
        {isAdmin && (
          <div className="px-4 pb-2">
            <button
              onClick={() => setShowAdmin(true)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-rose-600/20 text-rose-400 rounded-xl hover:bg-rose-600/30 transition"
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">Upload Documents</span>
            </button>
          </div>
        )}

        {/* User Section */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{user.email}</p>
              <p className="text-xs text-slate-400">{isAdmin ? 'Administrator' : 'Pilot'}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign Out</span>
          </button>
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
            Powered by Gemini + pgvector + Hybrid Search
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 && !streamingContent ? (
            <WelcomeMessage />
          ) : (
            <div className="py-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} onCitationClick={handleCitationClick} />
              ))}
              {isStreaming && streamingContent && (
                <div className="flex gap-4 px-6 py-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
                    <div className="prose prose-sm max-w-none">
                      {streamingContent}
                      <span className="animate-pulse">▋</span>
                    </div>
                  </div>
                </div>
              )}
              {isLoading && <TypingIndicator />}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSend} disabled={isLoading || isStreaming} />
          </div>
        </div>
      </main>

      {/* Modals */}
      <AdminDashboard isOpen={showAdmin} onClose={() => setShowAdmin(false)} userId={user.id} />
      <SourceViewer
        isOpen={showSource}
        onClose={() => setShowSource(false)}
        page={sourcePage}
        document={sourceDocument}
      />
    </div>
  )
}
