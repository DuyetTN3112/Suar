import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import OrgBookmarksPage from '@/apps/org/modules/bookmarks/index.svelte'

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@inertiajs/svelte', () => ({
  page: {
    props: {
      auth: {
        user: {
          current_organization_role: 'org_admin',
        },
      },
    },
  },
  router: {
    get: vi.fn(),
    visit: vi.fn(),
    reload: vi.fn(),
  },
}))

vi.mock('@/apps/org/shared/stores/notification_store.svelte', () => ({
  notificationStore: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('OrgBookmarksPage', () => {
  it('uses unified pagination and preserves bookmark filters', () => {
    render(OrgBookmarksPage, {
      props: {
        bookmarks: [
          {
            id: 'bookmark-1',
            notes: 'Strong delivery',
            folder: 'Backend',
            rating: 5,
            created_at: '2026-07-01T00:00:00.000Z',
            talent: {
              id: 'talent-1',
              username: 'duyet',
              status: 'active',
              trust_score: 91,
              reviewed_skills_count: 3,
              imported_skills_count: 0,
              under_dispute_skills_count: 0,
              latest_confidence_signal: 'high',
            },
          },
        ],
        filters: {
          q: 'duyet',
          folder: 'Backend',
        },
        stats: {
          total: 24,
          folders: ['Backend'],
        },
        pagination: {
          mode: 'offset',
          page: 2,
          perPage: 10,
          total: 24,
          lastPage: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      },
    })

    expect(screen.getByText('11-20 / 24')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem hồ sơ' })).toHaveAttribute(
      'href',
      '/org/talents/talent-1'
    )
    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/org/bookmarks?q=duyet&folder=Backend&page=1'
    )
  })
})
