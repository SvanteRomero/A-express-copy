'use client'

import { useState } from "react"
import {
  updateProfile as apiUpdateProfile,
  changePassword as apiChangePassword,
  uploadProfilePicture as apiUploadProfilePicture,
} from "@/lib/api-client"
import { useAuth } from "@/hooks/use-auth"

export interface ProfileData {
  first_name: string
  last_name: string
  email: string
  phone: string
}

export function useProfile() {
  const { user, refreshAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const updateProfile = async (profileData: ProfileData) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // The API client interceptor handles setting the token from localStorage.

      let response = await apiUpdateProfile(profileData)

      // If we get a 401, try to refresh the token and retry
      if (response.status === 401) {
        const refreshSuccess = await refreshAuth()
        if (refreshSuccess) {
          // The interceptor will pick up the new token from localStorage.
          response = await apiUpdateProfile(profileData)
        } else {
          setError("Session expired. Please log in again.")
          return false
        }
      }

      if (response.data.error) {
        setError(response.data.error)
        return false
      }

      await refreshAuth()
      setSuccess("Profile updated successfully!")
      return true
    } catch (err: any) {
      setError(err.message || "Failed to update profile")
      return false
    } finally {
      setIsLoading(false)
    }
  }
  const changePassword = async (passwordData: {
    current_password: string
    new_password: string
    confirm_password: string
  }) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await apiChangePassword(passwordData)

      if (response.data.error) {
        setError(response.data.error)
        return false
      }

      setSuccess("Password changed successfully!")
      return true
    } catch (err: any) {
      setError(err.message || "Failed to change password")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const uploadProfilePicture = async (file: File) => {
    console.log("Uploading file:", file.name, file.size, file.type)
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append("profile_picture", file)
      console.log("FormData created, entries:", Array.from(formData.entries()))

      const response = await apiUploadProfilePicture(formData)
      console.log("API response:", response)

      if (response.data.error) {
        setError(response.data.error)
        return false
      }

      await refreshAuth()
      setSuccess("Profile picture updated successfully!")
      return true
    } catch (err: any) {
      console.error("Upload error:", err)
      setError(err.message || "Failed to upload profile picture")
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    error,
    success,
    updateProfile,
    changePassword,
    uploadProfilePicture,
    clearMessages: () => {
      setError(null)
      setSuccess(null)
    },
  }
}