"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { API_CONFIG, getApiUrl } from "./config"
import { login as apiLogin, getProfile } from "./api-client"

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

interface AuthTokens {
  access: string
  refresh: string
}

interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void // Add this
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  refreshAuth: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored auth data
    const storedUser = localStorage.getItem("auth_user")
    const storedTokens = localStorage.getItem("auth_tokens")

    if (storedUser && storedTokens) {
      const parsedUser = JSON.parse(storedUser)
      const parsedTokens = JSON.parse(storedTokens)

      setUser(parsedUser)
      setTokens(parsedTokens)
    }
    setIsLoading(false)
  }, [])

const refreshAuth = async (): Promise<boolean> => {
  if (!tokens?.refresh) {
    console.error("No refresh token available")
    return false
  }

  try {
    const response = await fetch(getApiUrl(API_CONFIG.AUTH_ENDPOINTS.REFRESH), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh: tokens.refresh }),
    })

    if (response.ok) {
      const data = await response.json()
      const newTokens = {
        access: data.access,
        refresh: tokens.refresh // Keep the original refresh token
      }

      setTokens(newTokens)
      localStorage.setItem("auth_tokens", JSON.stringify(newTokens))
      
      // Also fetch updated user data
      const userResponse = await getProfile();
      if (userResponse.data) {
        const userData: User = userResponse.data as User;
        setUser(userData);
        localStorage.setItem("auth_user", JSON.stringify(userData));
      }
      
      return true
    } else {
      console.error("Token refresh failed")
      logout()
      return false
    }
  } catch (error) {
    console.error("Token refresh error:", error)
    return false
  }
}
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await apiLogin(username, password);

      if (response.data) {
        // Ensure response.data has the expected properties
        const { user: userData, access, refresh } = response.data as { user: User; access: string; refresh: string };

        setUser(userData);
        setTokens({ access, refresh });

        localStorage.setItem("auth_user", JSON.stringify(userData));
        localStorage.setItem("auth_tokens", JSON.stringify({ access, refresh }));

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
    setTokens(null)
    localStorage.removeItem("auth_user")
    localStorage.removeItem("auth_tokens")
    window.location.href = "/"
  }

  const value = {
    user,
    tokens,
    isAuthenticated: !!user,
    setUser, // Add setUser to the context value
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