"use client"

import { useState, useEffect } from "react"
import {
  apiClient,
  activateUser,
  deactivateUser,
  deleteUser as apiDeleteUser,
  registerUser,
  updateUser as apiUpdateUser,
} from "./api-client"
import { useAuth } from "./auth-context"
import { toast } from "@/hooks/use-toast"

export interface User {
  id: number
  username: string
  email: string
  role: "Administrator" | "Manager" | "Technician" | "Front Desk" | "Accountant"
  first_name: string
  last_name: string
  full_name: string
  phone: string
  profile_picture: string
  is_active: boolean
  is_workshop: boolean
  created_at: string
  last_login: string
}

export function useUserManagement() {
  const { tokens } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load users on component mount
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient.get("/users/")
      if (response.data) {
        setUsers(Array.isArray(response.data) ? response.data : [])
      }
    } catch (error) {
      console.error("Failed to load users:", error)
      setError("Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }

  const createUser = async (userData: {
    username: string
    email: string
    password: string
    first_name: string
    last_name: string
    phone: string
    role: "Administrator" | "Manager" | "Technician" | "Front Desk" | "Accountant"
    is_workshop: boolean
  }) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await registerUser(userData)

      if (response.data.error) {
        setError(response.data.error)
        toast({
          title: "Error",
          description: response.data.error,
          variant: "destructive",
        })
        return false
      }

      toast({
        title: "Success",
        description: "User created successfully",
      })
      
      // Reload users list
      await loadUsers()
      return true
    } catch (err: any) {
      setError(err.message || "Failed to create user")
      toast({
        title: "Error",
        description: "Failed to create user",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateUser = async (userId: number, userData: Partial<User>) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiUpdateUser(userId, userData);
      if (response.data.error) {
        setError(response.data.error)
        toast({
          title: "Error",
          description: response.data.error,
          variant: "destructive",
        })
        return false
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      })
      
      // Reload users list
      await loadUsers()
      return true
    } catch (err: any) {
      setError(err.message || "Failed to update user")
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const deleteUser = async (userId: number) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await apiDeleteUser(userId)

      if (response.data.error) {
        setError(response.data.error)
        toast({
          title: "Error",
          description: response.data.error,
          variant: "destructive",
        })
        return false
      }

      toast({
        title: "Success",
        description: "User deleted successfully",
      })
      
      // Reload users list
      await loadUsers()
      return true
    } catch (err: any) {
      setError(err.message || "Failed to delete user")
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserStatus = async (userId: number, isActive: boolean) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = isActive 
        ? await activateUser(userId)
        : await deactivateUser(userId)

      if (response.data.error) {
        setError(response.data.error)
        toast({
          title: "Error",
          description: response.data.error,
          variant: "destructive",
        })
        return false
      }

      toast({
        title: "Success",
        description: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      })
      
      // Reload users list
      await loadUsers()
      return true
    } catch (err: any) {
      setError(err.message || `Failed to ${isActive ? 'activate' : 'deactivate'} user`)
      toast({
        title: "Error",
        description: `Failed to ${isActive ? 'activate' : 'deactivate'} user`,
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    users,
    isLoading,
    error,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
  }
}