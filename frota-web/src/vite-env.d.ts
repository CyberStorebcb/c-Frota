/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string
  readonly VITE_GEMINI_MODEL?: string
  /** E-mail do administrador (login com VITE_ADMIN_PASSWORD → papel admin). */
  readonly VITE_ADMIN_EMAIL?: string
  readonly VITE_ADMIN_PASSWORD?: string
}
