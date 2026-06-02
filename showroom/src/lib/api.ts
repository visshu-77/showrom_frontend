// In dev, empty string → relative paths handled by Vite proxy.
// In production, set VITE_API_BASE_URL to your backend origin.
export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? "";
