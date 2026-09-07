/**
 * Svelte 5 Entry Point for Inertia.js
 *
 * This file initializes the Inertia.js app with Svelte 5.
 * Uses the new mount() API from Svelte 5 instead of the legacy constructor.
 *
 * Run with: USE_SVELTE=true pnpm dev
 */

import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import '@/apps/user/shared/css/app.css'

import { createInertiaApp } from '@inertiajs/svelte'
import axios from 'axios'
import { hydrate, mount } from 'svelte'

import {
  captureRuntimeError,
  installAxiosErrorPolicy,
  installGlobalRuntimeErrorBoundary,
} from '@/apps/shared/http/axios_error_policy'
import { initTheme } from '@/apps/user/shared/stores/theme.svelte'
import type { InertiaPageModule, PageComponentRecord } from '@/apps/user/shared/types/inertia'

const pages: PageComponentRecord = import.meta.glob<InertiaPageModule>([
  './pages/**/*.svelte',
  './modules/**/*.svelte'
])

type CreateInertiaAppOptions = NonNullable<Parameters<typeof createInertiaApp>[0]>
type ComponentResolver = NonNullable<CreateInertiaAppOptions['resolve']>
type ResolvedComponent = Awaited<ReturnType<ComponentResolver>>
type InitialPage = NonNullable<CreateInertiaAppOptions['page']>

// Configure Axios with CSRF token.
axios.defaults.withCredentials = true

function readCsrfToken(): string | null {
  return document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? null
}

const csrfToken = readCsrfToken()
if (csrfToken) {
  axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken
}

axios.interceptors.request.use((config) => {
  const token = readCsrfToken()
  if (token) {
    config.headers.set('X-CSRF-TOKEN', token)
  }
  return config
})

installAxiosErrorPolicy(axios)
installGlobalRuntimeErrorBoundary('user')

initTheme()

const appEl = document.getElementById('app')
const initialPage = appEl?.dataset.page ? (JSON.parse(appEl.dataset.page) as InitialPage) : undefined

// Initialize Inertia with Svelte 5.
void createInertiaApp({
  page: initialPage,

  progress: {
    color: '#f45d2d',
    showSpinner: true,
  },

  resolve: async (name): Promise<ResolvedComponent> => {
    // Resolve Svelte pages from the pages directory.
    let page = pages[`./pages/${name}.svelte`]

    // If not found, try the modules directory.
    if (page === undefined) {
      const parts = name.split('/')
      if (parts.length >= 2) {
        const moduleName = parts[0]
        const pagePath = parts.slice(1).join('/')
        if (moduleName !== undefined) {
          page = pages[`./modules/${moduleName}/${pagePath}.svelte`]
        }
      }
    }

    if (page === undefined) {
      page = pages[`./modules/${name}.svelte`]
    }

    if (page === undefined && !name.includes('/')) {
      page = pages[`./modules/${name}/index.svelte`]
    }

    if (page === undefined && name === 'index') {
      page = pages['./modules/dashboard/index.svelte']
    }

    if (page === undefined) {
      throw new Error(`Page not found: ${name}. Make sure you have created ./pages/${name}.svelte or ./modules/<name>/pages/<subpath>.svelte`)
    }

    const resolved = await page()

    return resolved
  },

  setup({ el, App, props }) {
    if (!el) {
      throw new Error('Inertia root element not found')
    }

    // Svelte 5 uses mount() for client-side rendering
    // Use hydrate() if server-side rendering is enabled
    if (el.dataset.serverRendered === 'true') {
      hydrate(App, { target: el, props })
    } else {
      mount(App, { target: el, props })
    }
  },
}).catch((error: unknown) => {
  captureRuntimeError(error, { surface: 'user', stage: 'bootstrap' })
})

// Debug info cho development
if (import.meta.env.DEV) {
  console.warn('🚀 Svelte 5 + Inertia.js initialized')
  console.warn('📁 Pages directory: ../pages/')
}
