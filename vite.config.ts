import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 开发态把 /api 代理到本地后端；发布态由 nginx 完成同样的反代。
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': apiProxyTarget,
    },
  },
})
