import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import CursorPagination from '@/apps/admin/shared/ui/cursor_pagination.svelte'

describe('CursorPagination', () => {
  it('renders href controls and newest shortcut when requested', () => {
    render(CursorPagination, {
      props: {
        hasPreviousPage: true,
        hasNextPage: true,
        newerHref: '/feed?before=cursor-newer',
        newestHref: '/feed',
        olderHref: '/feed?after=cursor-older',
        showNewestShortcut: true,
        summary: 'Cursor feed',
      },
    })

    expect(screen.getByText('Cursor feed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /mới hơn/i })).toHaveAttribute(
      'href',
      '/feed?before=cursor-newer'
    )
    expect(screen.getByRole('link', { name: /mới nhất/i })).toHaveAttribute(
      'href',
      '/feed'
    )
    expect(screen.getByRole('link', { name: /cũ hơn/i })).toHaveAttribute(
      'href',
      '/feed?after=cursor-older'
    )
  })

  it('falls back to newest callback for newer action when dedicated newer handler is absent', async () => {
    const visited: string[] = []

    render(CursorPagination, {
      props: {
        hasPreviousPage: true,
        hasNextPage: true,
        onLoadNewest: () => {
          visited.push('newest')
        },
        onLoadOlder: () => {
          visited.push('older')
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /mới hơn/i }))
    await fireEvent.click(screen.getByRole('button', { name: /cũ hơn/i }))

    expect(visited).toEqual(['newest', 'older'])
  })
})
