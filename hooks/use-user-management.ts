"use client"

import { useState, useEffect } from "react"
import {
  apiClient,
  activateUser,
  deactivateUser,
  deleteUser as apiDeleteUser,
  registerUser,
  updateUser as apiUpdateUser,
} from "@/lib/api-client"

import { showGreenSuccessToast } from "@/components/notifications/toast"
import { useNotifications } from "@/lib/notification-context"
import { handleApiError } from "@/lib/error-handling"

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
  active_task_count?: number
}

export function useUserManagement() {

  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { addNotification } = useNotifications()

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
      await registerUser(userData)

      showGreenSuccessToast("Success", "User created successfully")

      addNotification({
        title: "New Team Member",
        message: `User ${userData.first_name} ${userData.last_name} (${userData.role}) has been added to the team.`,
        type: "success",
        priority: "medium",
      })

      // Reload users list
      await loadUsers()
      return true
    } catch (err: any) {
      handleApiError(err, "Failed to create user")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const updateUser = async (userId: number, userData: Partial<User> & { password?: string }) => {
    setIsLoading(true)
    setError(null)

    try {
      await apiUpdateUser(userId, userData);

      showGreenSuccessToast("Success", "User updated successfully")

      // Reload users list
      await loadUsers()
      return true
    } catch (err: any) {
      handleApiError(err, "Failed to update user")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const deleteUser = async (userId: number) => {
    setIsLoading(true)
    setError(null)

    try {
      await apiDeleteUser(userId)

      showGreenSuccessToast("Success", "User deleted successfully")

      addNotification({
        title: "Team Member Removed",
        message: `A user account has been permanently deleted.`,
        type: "warning",
        priority: "high",
      })

      // Reload users list
      await loadUsers()
      return true
    } catch (err: any) {
      handleApiError(err, "Failed to delete user")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserStatus = async (userId: number, isActive: boolean) => {
    setIsLoading(true)
    setError(null)

    try {
      isActive
        ? await activateUser(userId)
        : await deactivateUser(userId)

      showGreenSuccessToast("Success", `User ${isActive ? 'activated' : 'deactivated'} successfully`)

      // Only notify on deactivation as it's a significant security/access event
      if (!isActive) {
        addNotification({
          title: "Access Revoked",
          message: `User access has been deactivated by an administrator.`,
          type: "warning",
          priority: "medium",
        })
      }

      // Reload users list
      await loadUsers()
      return true
    } catch (err: any) {
      handleApiError(err, `Failed to ${isActive ? 'activate' : 'deactivate'} user`)
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