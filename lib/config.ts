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

  // 2. If running in the browser (client-side), detect the Codespace URL
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
  }

  // 3. Fallback for local development (your machine)
  return "http://localhost:8000/api";
}

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

const getBaseUrl = (url: string) => {
  if (url.includes("/api")) {
    return url.split("/api")[0];
  }
  return url;
};

export const getMediaUrl = (path: string): string => {
  if (!path) {
    return "";
  }
  if (path.startsWith("http")) {
    return path;
  }
  const baseUrl = getBaseUrl(API_CONFIG.BASE_URL);
  // Ensure we don't end up with double slashes if path starts with /
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};