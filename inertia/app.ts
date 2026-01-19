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
import '@/css/app.css'


import { createInertiaApp } from '@inertiajs/svelte'
import type { AxiosError } from 'axios'
import axios from 'axios'
import { hydrate, mount } from 'svelte'

import AdminLayout from '@/layouts/admin_layout.svelte'
import { initTheme } from '@/stores/theme.svelte'
import type { InertiaPageModule, PageComponentRecord } from '@/types/inertia'

const pages: PageComponentRecord = import.meta.glob<InertiaPageModule>('./pages/**/*.svelte')

type CreateInertiaAppOptions = NonNullable<Parameters<typeof createInertiaApp>[0]>
type ComponentResolver = NonNullable<CreateInertiaAppOptions['resolve']>
type ResolvedComponent = Awaited<ReturnType<ComponentResolver>>
type InitialPage = NonNullable<CreateInertiaAppOptions['page']>

// Configure Axios với CSRF token (giống React)
axios.defaults.withCredentials = true

const csrfToken = document.head.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
if (csrfToken) {
  axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken
}

// Axios error interceptor
axios.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.code === 'ERR_CANCELED' || error.message === 'canceled') {
      return Promise.reject(error)
    }
    if (error.message === 'Network Error') {
      console.error('Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet của bạn.')
    }
    return Promise.reject(error)
  }
)

initTheme()

const appEl = document.getElementById('app')
const initialPage = appEl?.dataset.page ? (JSON.parse(appEl.dataset.page) as InitialPage) : undefined

// Khởi tạo Inertia với Svelte 5
void createInertiaApp({
  page: initialPage,

  progress: {
    color: '#f45d2d',
    showSpinner: true,
  },

  resolve: async (name): Promise<ResolvedComponent> => {
    // Resolve Svelte pages từ thư mục pages/ (cùng folder với React)
    // Khi migrate xong 1 file React, đổi đuôi từ .tsx sang .svelte
    const page = pages[`./pages/${name}.svelte`]

    if (page === undefined) {
      throw new Error(`Page not found: ${name}. Make sure you have created ./pages/${name}.svelte`)
    }

    const resolved = await page()

    // Keep admin sidebar/layout persistent across intra-admin navigation.
    // Do not mutate `resolved` directly because ESM module namespace objects are immutable.
    if (name.startsWith('admin/')) {
      return {
        ...resolved,
        layout: (resolved.layout ?? AdminLayout) as ResolvedComponent['layout'],
      }
    }

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
})

// Debug info cho development
if (import.meta.env.DEV) {
  console.warn('🚀 Svelte 5 + Inertia.js initialized')
  console.warn('📁 Pages directory: ../pages/')
}
