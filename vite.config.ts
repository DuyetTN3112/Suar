import { defineConfig, loadEnv } from 'vite'
import inertia from '@adonisjs/inertia/vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import adonisjs from '@adonisjs/vite/client'
import path from 'node:path'

const dirname = import.meta.dirname

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDebug = env.VITE_DEBUG === 'true'
  const logLevel = isDebug ? 'info' : 'warn'

  return {
    plugins: [
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
