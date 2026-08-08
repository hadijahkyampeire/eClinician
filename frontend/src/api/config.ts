// Render sets VITE_API_URL to a bare hostname, so assume https when no scheme
// is given. Locally the fallback points at the Spring Boot dev server.
const configured = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export const API_URL = configured.includes('://') ? configured : `https://${configured}`
