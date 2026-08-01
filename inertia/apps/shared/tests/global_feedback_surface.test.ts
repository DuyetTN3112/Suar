import { cleanup, render, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

const inertiaMocks = vi.hoisted(() => ({
  page: {
    props: {},
  },
}))

const toastMocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}))

vi.mock('@inertiajs/svelte', () => ({
  page: inertiaMocks.page,
}))

vi.mock('svelte-sonner', () => ({
  toast: toastMocks,
}))

import GlobalFeedbackSurface from '../feedback/global_feedback_surface.svelte'
import { API_PROBLEM_EVENT } from '../http/axios_error_policy'

describe('GlobalFeedbackSurface', () => {
  afterEach(() => {
    cleanup()
    inertiaMocks.page.props = {}
    vi.clearAllMocks()
  })

  it('pushes flash messages from Inertia page props into the global toaster', async () => {
    inertiaMocks.page.props = {
      flash: {
        success: 'Profile saved',
        error: 'Could not save settings',
      },
    }

    render(GlobalFeedbackSurface)

    await waitFor(() => {
      expect(toastMocks.success).toHaveBeenCalledWith('Profile saved')
      expect(toastMocks.error).toHaveBeenCalledWith('Could not save settings')
    })
  })

  it('renders validation errors from page props instead of leaving them invisible', async () => {
    inertiaMocks.page.props = {
      errors: {
        email: 'Email is required',
        profile: {
          timezone: ['Timezone is invalid'],
        },
      },
    }

    render(GlobalFeedbackSurface)

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith('Please fix the highlighted fields.', {
        description: 'Email is required\nTimezone is invalid',
      })
    })
  })

  it('listens to normalized API problem events from the Axios error policy', async () => {
    render(GlobalFeedbackSurface)

    window.dispatchEvent(
      new CustomEvent(API_PROBLEM_EVENT, {
        detail: {
          status: 422,
          code: 'E_VALIDATION_ERROR',
          category: 'validation',
          title: 'Validation error',
          detail: 'The request payload is invalid.',
          type: null,
          requestId: null,
          correlationId: null,
          fieldErrors: {
            role: 'Role is not assignable',
          },
          retryAfterSeconds: null,
          retryable: false,
          recovery: 'none',
          networkError: false,
          timedOut: false,
          canceled: false,
        },
      })
    )

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith('Validation error', {
        description: 'Role is not assignable',
      })
    })
  })
})
