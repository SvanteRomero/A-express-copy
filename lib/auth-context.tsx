"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { login as apiLogin, checkAuth } from "./api-client"
import { apiClient } from "./api-client"
import { logout as apiLogout } from "./auth"

interface User {
  id: number
  username: string
  email: string
  role: "Administrator" | "Manager" | "Technician" | "Front Desk" | "Accountant"
  first_name: string
  last_name: string
  phone: string
  profile_picture: string
  is_active: boolean
  is_workshop: boolean
  created_at: string
  last_login: string
  address?: string
  bio?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  refreshAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check authentication status using cookie-based auth
    const initAuth = async () => {
      try {
        // First check localStorage for cached user data
        const storedUser = localStorage.getItem("auth_user")
        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }

        // Then verify with server using cookie auth
        const authResult = await checkAuth()
        if (authResult && authResult.user) {
          setUser(authResult.user)
          localStorage.setItem("auth_user", JSON.stringify(authResult.user))
        } else if (storedUser) {
          // Cookie auth failed but we had stored user - clear it
          setUser(null)
          localStorage.removeItem("auth_user")
        }
      } catch (error) {
        // Auth check failed - user is not authenticated
        setUser(null)
        localStorage.removeItem("auth_user")
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiLogin(username, password);

      if (response.data && response.data.user) {
        const { user: userData } = response.data as { user: User };
        setUser(userData);
        // User data is stored in localStorage by apiLogin
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = () => {
    setUser(null)
    localStorage.removeItem("auth_user")
    apiLogout()
  }

  const refreshAuth = async (): Promise<boolean> => {
    try {
      // Use cookie-based refresh endpoint
      await apiClient.post('/auth/refresh/')

      // Reload user profile after refresh
      const authResult = await checkAuth()
      if (authResult && authResult.user) {
        setUser(authResult.user)
        localStorage.setItem('auth_user', JSON.stringify(authResult.user))
        return true
      }
      return false
    } catch (err) {
      console.error('refreshAuth error', err)
      // Clear out user on failure
      setUser(null)
      localStorage.removeItem('auth_user')
      return false
    }
  }

  const value = {
    user,
    isAuthenticated: !!user,
    setUser,
    isLoading,
    login,
    logout,
    refreshAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
