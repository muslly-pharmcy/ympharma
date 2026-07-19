import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { User, UserRole } from '@/types'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Demo user for development
const demoUser: User = {
  id: '1',
  email: 'admin@mussly.ai',
  name: 'مدير النظام',
  role: 'super_admin',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
  phone: '+967-777-000-000',
  branchId: '1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for saved session
    const saved = localStorage.getItem('mussly-user')
    if (saved) {
      setUser(JSON.parse(saved))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    if (email === 'admin@mussly.ai' && password === 'admin') {
      setUser(demoUser)
      localStorage.setItem('mussly-user', JSON.stringify(demoUser))
    } else {
      throw new Error('بيانات الدخول غير صحيحة')
    }
    setIsLoading(false)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('mussly-user')
  }

  const hasRole = (roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      isLoading, 
      login, 
      logout, 
      hasRole 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
