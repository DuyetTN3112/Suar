/**
 * Svelte 5 Entry Point for Inertia.js
 *
 * This file initializes the Inertia.js app with Svelte 5.
 * Uses the new mount() API from Svelte 5 instead of the legacy constructor.
 *
 * Run with: USE_SVELTE=true pnpm dev
 */

import '@/css/app.css'

import type { AxiosError } from 'axios'
import type { InertiaPageModule, PageComponentRecord } from '@/types/inertia'

import { createInertiaApp } from '@inertiajs/svelte'
import axios from 'axios'
import { hydrate, mount } from 'svelte'

const pages: PageComponentRecord = import.meta.glob<InertiaPageModule>('./pages/**/*.svelte')

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

// Khởi tạo Inertia với Svelte 5
void createInertiaApp({
  progress: {
    color: '#4B5563',
    showSpinner: true,
  },

  resolve: async (name): Promise<InertiaPageModule> => {
    // Resolve Svelte pages từ thư mục pages/ (cùng folder với React)
    // Khi migrate xong 1 file React, đổi đuôi từ .tsx sang .svelte
    const page = pages[`./pages/${name}.svelte`]

    if (page === undefined) {
      throw new Error(`Page not found: ${name}. Make sure you have created ./pages/${name}.svelte`)
    }

    return page()
  },

  setup({ el, App, props }) {
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
  console.info('🚀 Svelte 5 + Inertia.js initialized')
  console.info('📁 Pages directory: ../pages/')
}
