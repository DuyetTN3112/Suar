import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import SimplePagination from '@/apps/user/modules/reviews/components/simple_pagination.svelte'

describe('Reviews SimplePagination', () => {
  it('preserves extra query params for page-number pagination', () => {
    render(SimplePagination, {
      props: {
        pagination: {
          mode: 'offset',
          total: 120,
          perPage: 20,
          page: 2,
          lastPage: 6,
          hasNextPage: true,
          hasPreviousPage: true,
        },
        baseUrl: '/admin/reviews',
        extraParams: {
          status: 'pending',
        },
      },
    })

    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/admin/reviews?status=pending&page=1'
    )
    expect(screen.getByRole('link', { name: 'Trang 3' })).toHaveAttribute(
      'href',
      '/admin/reviews?status=pending&page=3'
    )
  })

  it('renders cursor controls and preserves filters for moderation queues', () => {
    render(SimplePagination, {
      props: {
        pagination: {
          mode: 'cursor',
          total: 120,
          perPage: 20,
          page: 1,
          lastPage: 6,
          hasNextPage: true,
          hasPreviousPage: true,
          cursor: {
            nextCursor: 'cursor-older',
            previousCursor: 'cursor-newer',
          },
        },
        baseUrl: '/admin/reviews',
        extraParams: {
          status: 'pending',
        },
      },
    })

    expect(screen.getByText('1-20 / 120')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /mới hơn/i })).toHaveAttribute(
      'href',
      '/admin/reviews?status=pending&before=cursor-newer'
    )
    expect(screen.getByRole('link', { name: /cũ hơn/i })).toHaveAttribute(
      'href',
      '/admin/reviews?status=pending&after=cursor-older'
    )
  })
})
