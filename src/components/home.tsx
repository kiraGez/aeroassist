'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './auth-provider'
import { AuthForm } from './auth'
import ChatInterface from './chat-interface'
import { supabase } from '@/lib/supabase'

// Admin emails - must match server-side
const ADMIN_EMAILS = ['admin', 'wise_hat_2017', 'cool_ball_2253', 'kiraGez']

export default function Home() {
  const { user, loading, signOut } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (user?.email) {
      const email = user.email.toLowerCase()
      setIsAdmin(ADMIN_EMAILS.some(admin => email.includes(admin.toLowerCase())))
    } else {
      setIsAdmin(false)
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm />
  }

  return (
    <ChatInterface 
      user={user} 
      isAdmin={isAdmin} 
      onSignOut={signOut} 
    />
  )
}
