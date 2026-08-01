import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import UnifiedOffsetPagination from '@/apps/admin/shared/ui/unified_offset_pagination.svelte'

describe('UnifiedOffsetPagination', () => {
  it('renders normalized range and page summary', () => {
    render(UnifiedOffsetPagination, {
      props: {
        pagination: {
          mode: 'offset',
          page: 2,
          perPage: 10,
          total: 45,
          lastPage: 5,
          hasNextPage: true,
          hasPreviousPage: true,
        },
        baseUrl: '/projects',
      },
    })

    expect(screen.getByText('11-20 / 45')).toBeInTheDocument()
    expect(screen.getByText('2 / 5')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/projects?page=1'
    )
  })

  it('supports callback-based pagination without hrefs', async () => {
    const onPageChange = vi.fn()

    render(UnifiedOffsetPagination, {
      props: {
        pagination: {
          mode: 'offset',
          page: 2,
          perPage: 10,
          total: 45,
          lastPage: 5,
          hasNextPage: true,
          hasPreviousPage: true,
        },
        onPageChange,
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /trang tiếp theo/i }))

    expect(onPageChange).toHaveBeenCalledWith(3)
  })
})
