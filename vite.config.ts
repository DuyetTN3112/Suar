import { defineConfig, loadEnv } from 'vite'
import { getDirname } from '@adonisjs/core/helpers'
import inertia from '@adonisjs/inertia/client'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import react from '@vitejs/plugin-react'
import adonisjs from '@adonisjs/vite/client'
import path from 'node:path'

const dirname = getDirname(import.meta.url)

// Toggle giữa React và Svelte 5 bằng env variable
// Chạy: USE_SVELTE=true pnpm dev để dùng Svelte
// Default to Svelte if not explicitly set to false
const USE_SVELTE = process.env.USE_SVELTE !== 'false'

// Tạo plugin debug để hiển thị thông tin chi tiết
const viteDebugPlugin = {
  name: 'vite-debug-plugin',
  // configResolved(config: any) { /* unused */ },
  transformIndexHtml(html: string) {
    // Thêm comment để debug
    return html.replace('</head>', '<!-- Vite Debug Info: React Plugin Enabled --></head>')
  },
  // handleHotUpdate({ file }: { file: string; server: any }) { /* unused */ },
}

export default defineConfig(({ mode }) => {
  // Load biến môi trường dựa trên mode
  const env = loadEnv(mode, process.cwd(), '')
  // Xác định các tùy chọn debug
  const isDebug = env.VITE_DEBUG === 'true'
  const logLevel = isDebug ? 'info' : 'warn'
  return {
    plugins: [
      inertia({
        ssr: { enabled: false },
      }),

      // Conditional: Svelte 5 hoặc React
      USE_SVELTE
        ? svelte()
        : react({
            include: [/\.[jt]sx?$/],
            jsxRuntime: 'automatic',
          }),

      adonisjs({
        entrypoints: [USE_SVELTE ? 'inertia/app/app_svelte.ts' : 'inertia/app/app.tsx'],
        reload: ['inertia/**/*.tsx', 'inertia/**/*.svelte', 'resources/views/**/*.edge'],
      }),
      // Thêm plugin debug khi cần
      isDebug ? viteDebugPlugin : null,
    ].filter(Boolean),

    resolve: {
      extensions: USE_SVELTE
        ? ['.svelte', '.ts', '.js', '.json']
        : ['.tsx', '.ts', '.jsx', '.js', '.json'],
      alias: {
        '@': path.resolve(dirname, './inertia'),
        '@lib': path.resolve(dirname, './inertia/lib'),
        '$lib': path.resolve(dirname, './inertia/lib'),
        // Only include React aliases when not using Svelte
        ...(USE_SVELTE
          ? {}
          : {
              'react': 'react',
              'react-dom': 'react-dom',
            }),
      },
    },

    optimizeDeps: {
      include: USE_SVELTE
        ? ['svelte', '@inertiajs/svelte']
        : ['react', 'react-dom', '@inertiajs/react'],
      force: isDebug, // Force reoptimization in debug mode
    },

    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: true,
    },

    server: {
      hmr: {
        protocol: 'ws',
        timeout: 5000, // Increase timeout
        host: 'localhost',
        port: 24678, // Specify port explicitly
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
      // Thêm cấu hình để đảm bảo session được duy trì
      middlewareMode: false,
      fs: {
        strict: true,
        allow: [
          // Cho phép truy cập các thư mục cần thiết
          path.resolve(dirname),
          path.resolve(dirname, '../'),
        ],
      },
    },
    logLevel,
    define: {
      'process.env.DEBUG': JSON.stringify(isDebug ? 'vite:*' : ''),
      'process.env.VITE_DEBUG_MODE': JSON.stringify(isDebug),
    },
    esbuild: {
      keepNames: true,
      legalComments: 'inline',
    },
  }
})
