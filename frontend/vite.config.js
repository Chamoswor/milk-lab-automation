import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  base: '/',
  plugins: [
    vue(),
    vueDevTools(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    allowedHosts: true,
    proxy: {
      "/api": {
        target: process.env.CORS_ORIGIN || 'http://localhost:3000',
        changeOrigin: true,
        onProxyRes(proxyRes, req) {
          if (proxyRes.statusCode === 401) {
            return;
          }
          console.log(`[Proxy] ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
        },
      }
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
