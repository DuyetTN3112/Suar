import { defineConfig, loadEnv } from 'vite'
import { getDirname } from '@adonisjs/core/helpers'
import inertia from '@adonisjs/inertia/client'
import react from '@vitejs/plugin-react'
import adonisjs from '@adonisjs/vite/client'
import tailwind from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import path from 'node:path'

const dirname = getDirname(import.meta.url)

// Tạo plugin debug để hiển thị thông tin chi tiết
const viteDebugPlugin = {
  name: 'vite-debug-plugin',
  configResolved(config: any) {
    // Log thông tin cấu hình khi khởi động
  },
  transformIndexHtml(html: string) {
    // Thêm comment để debug
    return html.replace('</head>', '<!-- Vite Debug Info: React Plugin Enabled --></head>')
  },
  handleHotUpdate({ file }: { file: string; server: any }) {
    // Log thông tin hot update
    return []
  },
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
      react({
        include: [/\.[jt]sx?$/],
        jsxRuntime: 'automatic',
        babel: {
          plugins: ['@babel/plugin-transform-react-jsx'],
          // Thêm cấu hình để đảm bảo preamble được tạo
          babelrc: false,
          configFile: false,
        },
      }),
      adonisjs({
        entrypoints: ['inertia/app/app.tsx'],
        reload: ['inertia/**/*.tsx', 'resources/views/**/*.edge'],
      }),
      // Thêm plugin debug khi cần
      isDebug ? viteDebugPlugin : null,
    ].filter(Boolean),

    css: {
      postcss: {
        plugins: [tailwind(), autoprefixer()],
      },
    },

    resolve: {
      alias: {
        '@': path.resolve(dirname, './inertia'),
        '@lib': path.resolve(dirname, './inertia/lib'),
        'react': 'react',
        'react-dom': 'react-dom',
      },
    },

    optimizeDeps: {
      include: ['react', 'react-dom', '@inertiajs/react'],
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
