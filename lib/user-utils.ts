import type { User } from "@/components/provider/auth-provider"
import { getMediaUrl } from "@/lib/media-utils"

/**
 * Get the full name of a user.
 */
export const getUserFullName = (user: User | null | undefined): string => {
    if (!user) return ""
    return `${user.first_name} ${user.last_name}`.trim()
}

/**
 * Get the initials of a user for avatar fallback.
 */
export const getUserInitials = (user: User | null | undefined): string => {
    if (!user) return "U"
    if (user.first_name && user.last_name) {
        return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    } else if (user.first_name) {
        return user.first_name[0].toUpperCase()
    } else if (user.username) {
        return user.username[0].toUpperCase()
    }
    return "U"
}

/**
 * Get the profile picture URL for a user.
 */
export const getUserProfilePictureUrl = (user: User | null | undefined): string => {
    if (!user) return "/placeholder-user.jpg"
    return getMediaUrl(user.profile_picture)
}

/**
 * Get the dashboard URL based on the user's role.
 */
export const getDashboardUrl = (user: User | null | undefined): string => {
    if (!user) return "/dashboard"
    switch (user.role) {
        case "Administrator":
            return "/dashboard"
        case "Manager":
            return "/dashboard/manager"
        case "Technician":
            return "/dashboard/technician"
        case "Accountant":
            return "/dashboard/accountant"
        case "Front Desk":
            return "/dashboard"
        default:
            return "/dashboard"
    }
}
