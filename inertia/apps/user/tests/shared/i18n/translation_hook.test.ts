import { page } from '@inertiajs/svelte'
import { cleanup, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.unmock('@/apps/user/shared/hooks/use_translation.svelte')

import TranslationHookHarness from './translation_hook_harness.svelte'

describe('useTranslation', () => {
  afterEach(() => {
    cleanup()
    page.props = {
      errors: {},
      flash: {},
    }
  })

  it('resolves flat and namespace-wrapped values from live Inertia props', () => {
    page.props = {
      errors: {},
      flash: {},
      locale: 'vi',
      translations: {
        common: {
          cancel: 'Hủy',
        },
        user: {
          user: {
            users: 'Người dùng',
          },
        },
      },
    }

    render(TranslationHookHarness)

    expect(screen.getByTestId('locale')).toHaveTextContent('vi')
    expect(screen.getByTestId('wrapped')).toHaveTextContent('Người dùng')
    expect(screen.getByTestId('flat')).toHaveTextContent('Hủy')
    expect(screen.getByTestId('fallback')).toHaveTextContent('3 items')
    expect(screen.getByTestId('braced')).toHaveTextContent('3 items')
  })
})
