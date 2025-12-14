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
  // 1. If explicitly set in environment variables, use that
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2. If running in the browser (client-side), detect the deployment URL
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    const protocol = window.location.protocol;

    // Detect GitHub Codespaces (app.github.dev) or Gitpod
    if (
      host.includes("github.dev") ||
      host.includes("gitpod.io") ||
      host.includes("app.github.dev")
    ) {
      // If we are on the frontend port (usually 3000), switch to backend port (8000)
      // Standard Format: name-3000.app.github.dev -> name-8000.app.github.dev
      if (host.includes("-3000")) {
        const backendHost = host.replace("-3000", "-8000");
        return `${protocol}//${backendHost}/api`;
      }
    }

    // Detect Railway deployment (*.up.railway.app)
    if (host.includes("railway.app")) {
      // For Railway, the backend URL should be set via NEXT_PUBLIC_API_URL
      // This is a fallback message - you should set the env var in Railway
      console.warn(
        "Running on Railway but NEXT_PUBLIC_API_URL is not set. " +
        "Set this environment variable to your Django backend URL."
      );
    }
  }

  // 3. Fallback for local development (your machine)
  return "http://localhost:8000/api";
}

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// NOTE: For media URLs, use getMediaUrl from '@/lib/media-utils' instead.
// It handles S3 URLs (production) and local development URLs properly.