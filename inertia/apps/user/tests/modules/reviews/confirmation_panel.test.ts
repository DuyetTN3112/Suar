/* eslint-disable import-x/order */
import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import type { SerializedReviewSession } from '@/apps/user/modules/reviews/types.svelte'

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn<(url: string, data: { action: string; disputeReason?: string }, options: unknown) => void>(),
}))

interface ConfirmRequestOptions {
  preserveState: boolean
  preserveScroll: boolean
  onFinish: () => void
}

vi.mock('@inertiajs/svelte', () => ({
  router: {
    post: postMock,
  },
}))

import ConfirmationPanel from '@/apps/user/modules/reviews/components/confirmation_panel.svelte'

function buildSession(overrides: Partial<SerializedReviewSession> = {}): SerializedReviewSession {
  return {
    id: 'session-1',
    task_assignment_id: 'assignment-1',
    reviewee_id: 'reviewee-1',
    status: 'completed',
    manager_review_completed: true,
    creator_review_completed: false,
    peer_reviews_count: 1,
    required_peer_reviews: 2,
    confirmations: [],
    created_at: '2026-07-06T10:00:00.000Z',
    completed_at: '2026-07-06T11:00:00.000Z',
    updated_at: '2026-07-06T11:00:00.000Z',
    reviewer_assignments: [
      {
        id: 'assignment-required',
        review_session_id: 'session-1',
        reviewer_id: 'manager-1',
        reviewer_type: 'manager',
        assignment_role: 'creator_required',
        is_required: true,
        status: 'pending',
        due_at: null,
        submitted_at: null,
      },
    ],
    ...overrides,
  }
}

describe('ConfirmationPanel', () => {
  it('shows governance progress and pending required-reviewer warning', () => {
    render(ConfirmationPanel, {
      props: {
        sessionId: 'session-1',
        session: buildSession(),
      },
    })

    expect(screen.getByText('Manager')).toBeInTheDocument()
    expect(screen.getByText('Đã có')).toBeInTheDocument()
    expect(screen.getByText('Peer')).toBeInTheDocument()
    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('Creator')).toBeInTheDocument()
    expect(screen.getByText('Chưa có')).toBeInTheDocument()
    expect(screen.getByText(/Còn 1 reviewer bắt buộc/i)).toBeInTheDocument()
  })

  it('requires dispute reason and posts dispute payload once provided', async () => {
    postMock.mockReset()

    render(ConfirmationPanel, {
      props: {
        sessionId: 'session-1',
        session: buildSession(),
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Tranh chấp/i }))

    const submitButton = screen.getByRole('button', { name: /Gửi tranh chấp/i })
    expect(submitButton).toBeDisabled()

    await fireEvent.input(screen.getByLabelText(/Lý do tranh chấp/i), {
      target: { value: 'Manager bỏ sót evidence task comment.' },
    })

    expect(submitButton).not.toBeDisabled()
    await fireEvent.click(submitButton)

    expect(postMock).toHaveBeenCalledTimes(1)
    const [url, payload, options] = postMock.mock.calls[0] as [
      string,
      { action: string; disputeReason?: string },
      ConfirmRequestOptions,
    ]

    expect(url).toBe('/reviews/session-1/confirm')
    expect(payload).toEqual({
      action: 'disputed',
      disputeReason: 'Manager bỏ sót evidence task comment.',
    })
    expect(options.preserveState).toBe(true)
    expect(options.preserveScroll).toBe(true)
    expect(options.onFinish).toBeTypeOf('function')
  })
})
