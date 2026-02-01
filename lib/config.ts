export const API_CONFIG = {
  BASE_URL: getBaseApiUrl(),
  AUTH_ENDPOINTS: {
    LOGIN: "/login/",
    REGISTER: "/register/",
    PROFILE: "/profile/",
    USERS: "/users/",
    REFRESH: "/token/refresh/",
    UPDATE_PROFILE: "/profile/update/",
  },
} as const;

function getBaseApiUrl() {
  // Browser: use relative URL to leverage Next.js rewrites
  // This routes through Next.js server which uses internal Railway URL (free egress)
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const protocol = window.location.protocol;

    // GitHub Codespaces / Gitpod: direct connection to backend port
    if (
      host.includes("github.dev") ||
      host.includes("gitpod.io") ||
      host.includes("app.github.dev")
    ) {
      if (host.includes("-3000")) {
        const backendHost = host.replace("-3000", "-8000");
        return `${protocol}//${backendHost}/api`;
      }
    }

    // Railway & other deployments: use relative URL (goes through Next.js rewrites)
    return "/api";
  }

  // Server-side: use internal URL directly (for SSR if needed)
  if (process.env.DJANGO_INTERNAL_URL) {
    return `${process.env.DJANGO_INTERNAL_URL}/api`;
  }

  // Local development fallback
  return "http://localhost:8000/api";
}

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// NOTE: For media URLs, use getMediaUrl from '@/lib/media-utils' instead.
// It handles S3 URLs (production) and local development URLs properly.