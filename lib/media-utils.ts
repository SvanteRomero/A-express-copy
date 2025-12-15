import { API_CONFIG } from "./config"

/**
 * Get the full URL for a media file.
 * 
 * Handles:
 * - S3 URLs (already absolute) - returned as-is
 * - Local dev URLs with /api/media/ prefix
 * - Bare paths without prefix
 * 
 * @param path - The media file path from the API
 * @returns Full URL to the media file, or placeholder if path is empty
 */
export const getMediaUrl = (path: string | null | undefined): string => {
  if (!path) return "/placeholder-user.jpg"

  // S3 URLs are already absolute - return as-is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  // Get base URL without /api suffix for constructing media URLs
  const baseUrl = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '')

  // Handle paths that already include /api/media/
  if (path.startsWith('/api/media/')) {
    return `${baseUrl}${path}`
  }

  // Handle paths that start with just /media/
  if (path.startsWith('/media/')) {
    return `${baseUrl}/api${path}`
  }

  // Handle bare paths (e.g., "profile_pictures/1/abc.jpg")
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}/api/media${cleanPath}`
}