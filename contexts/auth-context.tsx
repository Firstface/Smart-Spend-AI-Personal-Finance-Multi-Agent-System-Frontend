"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { apiLogin, apiRegister } from "@/lib/api"

interface User {
  id: string
  username: string
  email: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem("auth_token")
    const savedUser = localStorage.getItem("user")
    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    const { token, user: u } = await apiLogin(email, password)
    localStorage.setItem("auth_token", token)
    const userObj: User = { id: u.id, username: u.username, email: u.email }
    localStorage.setItem("user", JSON.stringify(userObj))
    setUser(userObj)
  }

  const register = async (username: string, email: string, password: string) => {
    const { token, user: u } = await apiRegister(username, email, password)
    localStorage.setItem("auth_token", token)
    const userObj: User = { id: u.id, username: u.username, email: u.email }
    localStorage.setItem("user", JSON.stringify(userObj))
    setUser(userObj)
  }

  const logout = () => {
    localStorage.removeItem("auth_token")
    localStorage.removeItem("user")
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
