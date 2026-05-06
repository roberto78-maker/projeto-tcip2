import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// URL do Django — pode ser sobrescrita por VITE_DJANGO_URL no .env.local
// (útil quando o Django roda em outra máquina ou porta diferente)
const DJANGO_URL = process.env.VITE_DJANGO_URL || 'http://localhost:8000'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: true,          // expõe na rede local (acesso por celular/tablet via IP)
    allowedHosts: true,  // aceita qualquer hostname (ngrok, IP de rede, etc.)
    proxy: {
      // Redireciona /api/* → Django (transparente, sem CORS)
      '/api': {
        target: DJANGO_URL,
        changeOrigin: true,
        secure: false,
      },
      // Redireciona /media/* → Django (arquivos de upload)
      '/media': {
        target: DJANGO_URL,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true,
    allowedHosts: true,
  },
})