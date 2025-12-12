import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import UnifiedCursorPagination from '@/apps/org/shared/ui/unified_cursor_pagination.svelte'

describe('UnifiedCursorPagination', () => {
  it('renders cursor controls with canonical summary and page position', () => {
    render(UnifiedCursorPagination, {
      props: {
        pagination: {
          mode: 'cursor',
          page: 2,
          perPage: 5,
          total: 20,
          lastPage: 4,
          hasNextPage: true,
          hasPreviousPage: true,
          cursor: {
            nextCursor: 'next',
            previousCursor: 'prev',
          },
        },
        newerHref: '/reviews?before=prev',
        olderHref: '/reviews?after=next',
      },
    })

    expect(screen.getByText('6-10 / 20')).toBeInTheDocument()
    expect(screen.getByText('2 / 4')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /mới hơn/i })).toHaveAttribute(
      'href',
      '/reviews?before=prev'
    )
    expect(screen.getByRole('link', { name: /cũ hơn/i })).toHaveAttribute(
      'href',
      '/reviews?after=next'
    )
  })
})
