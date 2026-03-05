import path from 'node:path'

import inertia from '@adonisjs/inertia/vite'
import adonisjs from '@adonisjs/vite/client'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

const dirname = import.meta.dirname

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const isDebug = env['VITE_DEBUG'] === 'true'
  const logLevel = isDebug ? 'info' : 'warn'

  return {
    plugins: [
      tailwindcss(),
      inertia({
        ssr: { enabled: false },
      }),
      svelte(),
      adonisjs({
        entrypoints: ['inertia/apps/user/app.ts', 'inertia/apps/org/app.ts', 'inertia/apps/admin/app.ts'],
        reload: ['inertia/**/*.svelte', 'resources/views/**/*.edge'],
      }),
    ],

    resolve: {
      extensions: ['.svelte', '.ts', '.js', '.json'],
      alias: {
        '@': path.resolve(dirname, './inertia'),
        '@user': path.resolve(dirname, './inertia/apps/user'),
        '@org': path.resolve(dirname, './inertia/apps/org'),
        '@admin': path.resolve(dirname, './inertia/apps/admin'),
        // Keep old aliases for compatibility just in case
        '@lib': path.resolve(dirname, './inertia/apps/user/shared/lib'),
        '$lib': path.resolve(dirname, './inertia/apps/user/shared/lib'),
        '@shared': path.resolve(dirname, './inertia/apps/user/shared'),
        '@modules': path.resolve(dirname, './inertia/apps/user/modules'),
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
      rolldownOptions: {
        output: {
          codeSplitting: {
            minSize: 20_000,
            groups: [
              {
                name: 'vendor-core',
                test: /node_modules[\\/](svelte|@inertiajs|axios|lucide-svelte|@floating-ui)[\\/]/,
                priority: 30,
                maxSize: 250_000,
              },
              {
                name: 'vendor',
                test: /node_modules[\\/]/,
                priority: 20,
                maxSize: 250_000,
              },
            ],
          },
        },
      },
    },

    server: {
      allowedHosts: true,
      ws: {
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
