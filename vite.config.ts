import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 开发态把 /api 代理到本地后端；发布态由 nginx 完成同样的反代。
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8080'

export default defineConfig({
  // 相对资源路径：同一份构建既能挂在根（`/`），也能挂在子路径（console-web 的 `/atlas/`）。
  // API 前缀由 `src/api/client.ts` 按 `document.baseURI` 推导，不写死 `/api`。
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': apiProxyTarget,
    },
  },
})
