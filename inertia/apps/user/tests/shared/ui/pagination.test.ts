import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import Pagination from '@/apps/user/shared/ui/pagination.svelte'

describe('Pagination', () => {
  it('renders page links from current page, total pages, and query params', () => {
    render(Pagination, {
      props: {
        currentPage: 3,
        totalPages: 8,
        baseUrl: '/users',
        queryParams: {
          search: 'alice',
          status: 'active',
          empty: '',
          unset: undefined,
        },
      },
    })

    expect(screen.getByRole('navigation', { name: /phân trang/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/users?search=alice&status=active&page=2'
    )
    expect(screen.getByRole('link', { name: 'Trang 1' })).toHaveAttribute(
      'href',
      '/users?search=alice&status=active&page=1'
    )
    expect(screen.getByRole('link', { name: 'Trang 3' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: 'Trang 8' })).toHaveAttribute(
      'href',
      '/users?search=alice&status=active&page=8'
    )
  })

  it('renders action buttons when onPageChange is provided without baseUrl', () => {
    const visited: number[] = []

    render(Pagination, {
      props: {
        currentPage: 2,
        totalPages: 4,
        onPageChange: (page: number) => {
          visited.push(page)
        },
      },
    })

    const previous = screen.getByRole('button', { name: /trang trước/i })
    const next = screen.getByRole('button', { name: /trang tiếp theo/i })

    expect(previous).toBeEnabled()
    expect(next).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Trang 2' })).toHaveAttribute('aria-current', 'page')
    expect(visited).toEqual([])
  })

  it('invokes callback pagination in button mode', async () => {
    const visited: number[] = []

    render(Pagination, {
      props: {
        currentPage: 2,
        totalPages: 4,
        onPageChange: (page: number) => {
          visited.push(page)
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /trang trước/i }))
    await fireEvent.click(screen.getByRole('button', { name: 'Trang 4' }))

    expect(visited).toEqual([1, 4])
  })

  it('supports custom page query parameter names', () => {
    render(Pagination, {
      props: {
        currentPage: 2,
        totalPages: 4,
        baseUrl: '/organizations',
        pageParam: 'joined_page',
        queryParams: {
          tab: 'joined',
          available_page: 3,
          search: 'acme',
        },
      },
    })

    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/organizations?tab=joined&available_page=3&search=acme&joined_page=1'
    )
  })
})
