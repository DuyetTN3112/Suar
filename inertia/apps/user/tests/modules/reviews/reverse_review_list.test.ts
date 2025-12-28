import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import ReverseReviewList from '@/apps/user/modules/reviews/components/reverse_review_list.svelte'

vi.mock('@/apps/user/modules/reviews/components/simple_pagination.svelte', async () => {
  const module = await import('../../shared/test_stubs/empty_stub.svelte')
  return { default: module.default }
})

describe('ReverseReviewList', () => {
  it('renders Vietnamese target labels and filters reviews by target type', async () => {
    render(ReverseReviewList, {
      props: {
        title: 'Radar feedback',
        scope: 'org',
        reviews: [
          {
            id: 'review-1',
            targetLabel: 'lead-a',
            targetType: 'manager',
            targetTypeLabel: 'Manager',
            authorLabel: 'Ẩn danh',
            submittedAtLabel: '09/07/2026',
            rating: 5,
            comment: 'Manager review tốt.',
            isAnonymous: true,
          },
          {
            id: 'review-2',
            targetLabel: 'peer-b',
            targetType: 'peer',
            targetTypeLabel: 'Peer',
            authorLabel: 'duyet',
            submittedAtLabel: '09/07/2026',
            rating: 3,
            comment: 'Peer review cần rõ hơn.',
            isAnonymous: false,
          },
        ],
        stats: {
          total: 2,
          anonymous: 1,
          byTargetType: {
            manager: 1,
            peer: 1,
          },
        },
        pagination: {
          mode: 'offset',
          page: 1,
          perPage: 20,
          total: 2,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        baseUrl: '/org/reverse-reviews',
      },
    })

    expect(screen.getByText('Quản lý nhận 1 phản hồi.')).toBeInTheDocument()
    expect(screen.getByText('Quản lý · 1')).toBeInTheDocument()
    expect(screen.getByText('Môi trường làm việc · 1')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Mở bộ lọc' }))
    await fireEvent.change(screen.getByLabelText('Loại đánh giá'), {
      target: { value: 'manager' },
    })

    expect(screen.getByText('Manager review tốt.')).toBeInTheDocument()
    expect(screen.queryByText('Peer review cần rõ hơn.')).not.toBeInTheDocument()
  })
})
