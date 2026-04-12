import { defineConfig, loadEnv } from 'vite'
import inertia from '@adonisjs/inertia/vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import adonisjs from '@adonisjs/vite/client'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const dirname = import.meta.dirname

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDebug = env.VITE_DEBUG === 'true'
  const logLevel = isDebug ? 'info' : 'warn'

  return {
    plugins: [
      tailwindcss(),
      inertia({
        ssr: { enabled: false },
      }),
      svelte(),
      adonisjs({
        entrypoints: ['inertia/app.ts'],
        reload: ['inertia/**/*.svelte', 'resources/views/**/*.edge'],
      }),
    ],

    resolve: {
      extensions: ['.svelte', '.ts', '.js', '.json'],
      alias: {
        '@': path.resolve(dirname, './inertia'),
        '@lib': path.resolve(dirname, './inertia/lib'),
        '$lib': path.resolve(dirname, './inertia/lib'),
      },
    },

    optimizeDeps: {
      include: ['svelte', '@inertiajs/svelte'],
      force: isDebug,
    },

    build: {
      target: 'esnext',
      minify: 'esbuild',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replaceAll('\\', '/')

            if (normalizedId.includes('/inertia/pages/')) {
              const pagePath = normalizedId.split('/inertia/pages/')[1] ?? ''
              const [section = 'shared'] = pagePath.split('/')
              return `pages-${section}`
            }

            if (!normalizedId.includes('/node_modules/')) {
              return undefined
            }

            const packagePath = normalizedId.split('node_modules/').at(-1) ?? 'vendor'
            const segments = packagePath.split('/')

            const packageName =
              segments[0]?.startsWith('@') && segments[1]
                ? `${segments[0].slice(1)}-${segments[1]}`
                : segments[0]

            if (packageName === 'internationalized-date' || packageName === 'swc-helpers') {
              return undefined
            }

            return packageName ? `vendor-${packageName}` : 'vendor'
          },
        },
      },
    },

    server: {
      hmr: {
        protocol: 'ws',
        timeout: 5000,
        host: 'localhost',
        port: 24678,
      },
      watch: {
        usePolling: true,
        interval: 1000,
      },
      middlewareMode: false,
      fs: {
        strict: true,
        allow: [path.resolve(dirname), path.resolve(dirname, '../')],
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
