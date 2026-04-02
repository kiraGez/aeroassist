'use client'

import { AuthProvider } from './auth-provider'
import Home from './home'

export default function App() {
  return (
    <AuthProvider>
      <Home />
    </AuthProvider>
  )
}
