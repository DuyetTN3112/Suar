import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

const inertiaMocks = vi.hoisted(() => ({
  get: vi.fn(),
  page: {
    url: '/login?redirect=%2Fdashboard&locale=vi#credentials',
  },
}))

vi.mock('@inertiajs/svelte', () => ({
  page: inertiaMocks.page,
  router: {
    get: inertiaMocks.get,
  },
}))

import LanguageSwitcher from '@/apps/user/shared/ui/language_switcher.svelte'

describe('LanguageSwitcher', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('switches locale on the current URL instead of navigating to the translation asset route', async () => {
    render(LanguageSwitcher, {
      props: {
        locale: 'vi',
        supportedLocales: ['vi', 'en'],
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'en' }))

    expect(inertiaMocks.get).toHaveBeenCalledWith(
      '/login?redirect=%2Fdashboard&locale=en#credentials',
      {},
      {
        preserveScroll: true,
        preserveState: true,
      }
    )
  })
})
