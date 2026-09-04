import type { HttpResponse } from '@inertiajs/core'
import { http, router } from '@inertiajs/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createSearchNavigation } from '@/apps/shared/search/search_navigation'

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve
  })
  return { promise, resolve }
}

function inertiaPageResponse(url: string, title: string): HttpResponse {
  return {
    status: 200,
    data: JSON.stringify({
      component: 'search/index',
      props: { title, errors: {} },
      url,
      version: null,
    }),
    headers: { 'x-inertia': 'true' },
  }
}

describe('Search navigation late responses', () => {
  afterEach(() => {
    router.cancelAll()
  })

  it('does not let a response that arrives after a newer search replace the newer page', async () => {
    const initialPage = {
      component: 'search/index',
      props: { title: 'Initial', errors: {} },
      url: '/search',
      version: null,
      rescuedProps: [],
    }
    const swaps: Array<{ url: string; title: string }> = []
    const pending = new Map<string, Deferred<HttpResponse>>()
    const previousScrollTo = window.scrollTo
    window.scrollTo = () => {}

    router.init({
      initialPage,
      resolveComponent: () => ({}),
      swapComponent: ({ page }) => {
        swaps.push({ url: page.url, title: String(page.props.title) })
        return Promise.resolve()
      },
    })
    await vi.waitFor(() => expect(swaps).toContainEqual({ url: '/search', title: 'Initial' }))

    const previousClient = http.getClient()
    http.setClient({
      request: (config) => {
        const request = deferred<HttpResponse>()
        pending.set(new URL(config.url, window.location.origin).search, request)
        return request.promise
      },
    })

    try {
      swaps.length = 0
      const navigate = createSearchNavigation(router)
      navigate('/search?q=old')
      navigate('/search?q=new')

      await vi.waitFor(() => expect([...pending.keys()]).toEqual(['?q=old', '?q=new']))
      pending.get('?q=new')?.resolve(inertiaPageResponse('/search?q=new', 'New'))
      await vi.waitFor(() => expect(swaps).toContainEqual({ url: '/search?q=new', title: 'New' }))

      pending.get('?q=old')?.resolve(inertiaPageResponse('/search?q=old', 'Old'))
      await Promise.resolve()
      await Promise.resolve()
      await new Promise<void>((resolve) => setTimeout(resolve, 0))
      await new Promise<void>((resolve) => setTimeout(resolve, 0))

      expect(swaps).toEqual([{ url: '/search?q=new', title: 'New' }])
    } finally {
      http.setClient(previousClient)
      window.scrollTo = previousScrollTo
    }
  })
})
