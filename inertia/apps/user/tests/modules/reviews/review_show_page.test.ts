/* eslint-disable import-x/order */
import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import EmptyStub from '../../shared/test_stubs/empty_stub.svelte'
import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'
import type { ReviewSessionStatus, ShowReviewProps } from '@/apps/user/modules/reviews/types.svelte'

type ReviewShowPageProps = ShowReviewProps & {
  shellMode?: 'app' | 'organization'
  auth?: { user?: { current_organization_role?: string | null } }
  disputeId: string | null
}

const { inertiaPage } = vi.hoisted(() => ({
  inertiaPage: {
    props: {
      auth: {
        user: {
          id: 'reviewee-1',
          current_organization_role: null as string | null,
        },
      },
      flash: {},
    },
  },
}))

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@/apps/user/shared/layouts/organization_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@/apps/user/shared/stores/translation.svelte', () => ({
  useTranslation: () => ({
    t: (_key: string, _params?: Record<string, unknown>, fallback?: string) => fallback ?? '',
  }),
}))

vi.mock('@inertiajs/svelte', () => ({
  page: inertiaPage,
  Link: EmptyStub,
}))

vi.mock('@/apps/user/modules/reviews/components/review_show_header.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/user/modules/reviews/components/skill_rating_form.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/user/modules/reviews/components/review_results_section.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/user/modules/reviews/components/review_evidence_panel.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/user/modules/reviews/components/self_assessment_panel.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/user/modules/reviews/components/confirmation_panel.svelte', () => ({
  default: EmptyStub,
}))

import ReviewShowPage from '@/apps/user/modules/reviews/show.svelte'

function buildSession(overrides: Partial<ShowReviewProps['session']> = {}): ShowReviewProps['session'] {
  return {
    id: 'session-1',
    task_assignment_id: 'assignment-1',
    reviewee_id: 'reviewee-1',
    status: 'completed',
    manager_review_completed: true,
    creator_reviewer_id: 'manager-1',
    creator_review_completed: true,
    manager_reviews_count: 1,
    peer_reviews_count: 2,
    required_peer_reviews: 2,
    required_total_reviews: 3,
    minimum_manager_reviews: 1,
    minimum_peer_reviews: 1,
    confirmations: [],
    created_at: '2026-07-06T10:00:00.000Z',
    completed_at: '2026-07-06T11:00:00.000Z',
    updated_at: '2026-07-06T11:00:00.000Z',
    reviewee: {
      id: 'reviewee-1',
      username: 'duyet',
      email: 'duyet@example.com',
    },
    task_assignment: {
      id: 'assignment-1',
      task: {
        id: 'task-1',
        title: 'Review governance task',
        project_id: 'project-1',
        organization_id: 'org-1',
      },
    },
    reviewer_assignments: [],
    skill_reviews: [],
    ...overrides,
  }
}

function buildProps(
  sessionOverrides: Partial<ShowReviewProps['session']> = {},
  disputeId: string | null = null
): ReviewShowPageProps {
  return {
    session: buildSession(sessionOverrides),
    skills: [],
    proficiencyLevels: [],
    taskComments: [],
    disputeId,
  }
}

describe('ReviewShowPage', () => {
  it('shows reviewee completion tabs and dispute banner wiring without task-level reverse review', () => {
    inertiaPage.props.auth.user.id = 'reviewee-1'
    inertiaPage.props.auth.user.current_organization_role = null

    render(ReviewShowPage, {
      props: buildProps({ status: 'disputed' as ReviewSessionStatus, completed_at: null }, 'dispute-1'),
    })

    expect(screen.getByRole('tab', { name: 'Kết quả' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Evidence' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tự đánh giá' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Đánh giá ngược' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Xác nhận' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Đánh giá kỹ năng' })).not.toBeInTheDocument()
    expect(screen.getByText(/Đánh giá này đang bị khiếu nại/i)).toBeInTheDocument()
  })

  it('shows active review tabs for non-reviewer submission flow and hides reviewee-only tabs', async () => {
    inertiaPage.props.auth.user.id = 'peer-1'
    inertiaPage.props.auth.user.current_organization_role = 'org_member'

    render(ReviewShowPage, {
      props: buildProps({
        status: 'pending' as ReviewSessionStatus,
        manager_review_completed: false,
        reviewee_id: 'reviewee-1',
      }),
    })

    expect(screen.getByRole('tab', { name: 'Đánh giá kỹ năng' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Kết quả' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Evidence' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Xác nhận' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Tự đánh giá' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Đánh giá ngược' })).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('tab', { name: 'Evidence' }))
    expect(screen.getByRole('tab', { name: 'Evidence' })).toHaveAttribute('aria-selected', 'true')
  })
})
