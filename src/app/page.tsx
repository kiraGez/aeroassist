'use client'

import { useState, useEffect, useRef } from 'react'

// Admin emails
const ADMIN_EMAILS = ['admin', 'wise_hat_2017', 'cool_ball_2253', 'kiraGez', 'kiragez3@gmail.com']

export default function Home() {
  const [view, setView] = useState<'loading' | 'login' | 'chat'>('loading')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Check if user is logged in
    const savedUser = localStorage.getItem('aeroassist_user')
    if (savedUser) {
      setView('chat')
    } else {
      setView('login')
    }
  }, [])

  const handleAuth = () => {
    if (email && password.length >= 6) {
      localStorage.setItem('aeroassist_user', JSON.stringify({ email }))
      setView('chat')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('aeroassist_user')
    setView('login')
    setEmail('')
    setPassword('')
  }

  if (view === 'loading') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#0f172a',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✈️</div>
          <p>Loading AeroAssist...</p>
        </div>
      </div>
    )
  }

  if (view === 'login') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#0f172a',
        padding: '16px'
      }}>
        <div style={{ 
          background: '#1e293b', 
          borderRadius: '16px', 
          padding: '32px',
          width: '100%',
          maxWidth: '400px'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>✈️</div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>AeroAssist</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Flight Operations AI</p>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pilot@airline.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: 'white',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: 'white',
                fontSize: '16px',
                outline: 'none'
              }}
            />
          </div>

          <button
            onClick={handleAuth}
            disabled={!email || password.length < 6}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              background: (!email || password.length < 6) ? '#475569' : '#3b82f6',
              color: 'white',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: (!email || password.length < 6) ? 'not-allowed' : 'pointer'
            }}
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '16px', color: '#94a3b8', fontSize: '14px' }}>
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </p>
        </div>
      </div>
    )
  }

  // Chat view
  const isAdmin = ADMIN_EMAILS.some(e => email.toLowerCase().includes(e.toLowerCase()))
  
  return (
    <ChatView 
      email={email} 
      isAdmin={isAdmin}
      onLogout={handleLogout} 
    />
  )
}

function ChatView({ email, isAdmin, onLogout }: { email: string; isAdmin: boolean; onLogout: () => void }) {
  const [messages, setMessages] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [documents, setDocuments] = useState<Array<{id: string, title: string, total_pages: number}>>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const send = async () => {
    if (!input.trim() || loading) return
    
    const userMsg = { role: 'user' as const, content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input, history: messages })
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || data.error || 'No response' }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: ' + String(e) }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0f172a' }}>
      {/* Sidebar */}
      <aside style={{ width: '280px', background: '#1e293b', padding: '16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{ width: '40px', height: '40px', background: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ✈️
          </div>
          <div>
            <h1 style={{ color: 'white', fontWeight: 'bold' }}>AeroAssist</h1>
            <p style={{ color: '#64748b', fontSize: '12px' }}>Flight Operations AI</p>
          </div>
        </div>

        <div style={{ background: '#0f172a', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
          <p style={{ color: '#22c55e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></span>
            Connected
          </p>
          <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Gemini 2.5 Flash</p>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{ width: '32px', height: '32px', background: '#475569', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
            <div>
              <p style={{ color: 'white', fontSize: '14px' }}>{email}</p>
              <p style={{ color: '#64748b', fontSize: '12px' }}>Pilot</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            style={{ width: '100%', padding: '8px', background: '#334155', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '16px 24px', background: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#3b82f6' }}>🤖</span>
            <span style={{ color: 'white', fontWeight: 'bold' }}>AI Instructor</span>
          </div>
          <span style={{ color: '#64748b', fontSize: '14px' }}>Powered by Gemini + pgvector</span>
        </header>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: '80px', color: '#64748b' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✈️</div>
              <h2 style={{ color: 'white', fontSize: '20px', marginBottom: '8px' }}>Welcome to AeroAssist</h2>
              <p>Ask me about procedures, limitations, or request a quiz.</p>
              <p style={{ fontSize: '14px', marginTop: '16px' }}>Example: "What is the max crosswind for landing?"</p>
            </div>
          ) : (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ 
                  marginBottom: '16px', 
                  display: 'flex', 
                  gap: '12px',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                }}>
                  <div style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    background: msg.role === 'user' ? '#475569' : '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {msg.role === 'user' ? '👤' : '🤖'}
                  </div>
                  <div style={{ 
                    background: msg.role === 'user' ? '#3b82f6' : '#1e293b',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    maxWidth: '70%'
                  }}>
                    <p style={{ color: 'white', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
                  <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '12px' }}>
                    <span style={{ color: '#64748b' }}>Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '16px', background: '#1e293b' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', gap: '12px' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about procedures, limitations..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '12px',
                border: '1px solid #334155',
                background: '#0f172a',
                color: 'white',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              style={{
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                background: (loading || !input.trim()) ? '#475569' : '#3b82f6',
                color: 'white',
                fontWeight: 'bold',
                cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer'
              }}
            >
              Send
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
