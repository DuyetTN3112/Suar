import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { fireEvent, render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const routerMock = vi.hoisted(() => ({
  put: vi.fn(),
  visit: vi.fn(),
}))

vi.mock('@inertiajs/svelte', () => ({
  router: {
    put: routerMock.put,
    visit: routerMock.visit,
  },
}))

import AdminFlaggedReviewsPage from '@/apps/admin/modules/reviews/flagged.svelte'

const pagination = {
  mode: 'offset' as const,
  total: 1,
  perPage: 20,
  page: 1,
  lastPage: 1,
  hasNextPage: false,
  hasPreviousPage: false,
}

const flaggedReview = {
  id: 'flag-1',
  reviewer: {
    id: 'reviewer-1',
    username: 'reviewer',
    email: 'reviewer@example.com',
  },
  reviewee: {
    id: 'reviewee-1',
    username: 'reviewee',
  },
  reviewed_by: null,
  comment: 'Same score pattern on every review',
  flag_type: 'bulk_same_level',
  severity: 'high',
  status: 'pending',
  notes: null,
  created_at: '2026-07-05T12:00:00.000Z',
  reviewed_at: null,
}

function renderFlaggedReviewsPage() {
  return render(AdminFlaggedReviewsPage, {
    props: {
      reviews: [flaggedReview],
      pagination,
      filters: {
        after: null,
        before: null,
        flag_type: null,
        severity: null,
        status: null,
      },
    },
  })
}

function listSvelteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name)

    if (entry.isDirectory()) {
      return listSvelteFiles(absolutePath)
    }

    return entry.isFile() && entry.name.endsWith('.svelte') ? [absolutePath] : []
  })
}

describe('AdminFlaggedReviewsPage', () => {
  beforeEach(() => {
    routerMock.put.mockClear()
    routerMock.visit.mockClear()
  })

  it('renders from the canonical reviews prop', () => {
    renderFlaggedReviewsPage()

    expect(screen.getByText('reviewer → reviewee')).toBeInTheDocument()
    expect(screen.getByText('Same score pattern on every review')).toBeInTheDocument()
  })

  it('requires a moderation note before resolving and submits notes to the canonical route', async () => {
    renderFlaggedReviewsPage()

    const confirmButton = screen.getByRole('button', { name: /confirm|xác nhận/i })
    const dismissButton = screen.getByRole('button', { name: /dismiss|bỏ qua|bỏ cờ/i })

    expect(confirmButton).toBeDisabled()
    expect(dismissButton).toBeDisabled()

    await fireEvent.input(screen.getByPlaceholderText(/moderation note|ghi chú/i), {
      target: { value: 'Confirmed coordinated scoring pattern' },
    })

    expect(confirmButton).not.toBeDisabled()
    expect(dismissButton).not.toBeDisabled()

    await fireEvent.click(confirmButton)

    expect(routerMock.put).toHaveBeenCalledWith(
      '/admin/reviews/flag-1/resolve',
      {
        action: 'confirm',
        notes: 'Confirmed coordinated scoring pattern',
      },
      {
        preserveState: true,
        preserveScroll: true,
      }
    )
  })

  it('keeps live Svelte surfaces off the legacy flagged review route', () => {
    const liveSvelteFiles = listSvelteFiles(join(process.cwd(), 'inertia/apps/admin'))
    const legacyReferences = liveSvelteFiles.filter((filePath) =>
      readFileSync(filePath, 'utf8').includes('/admin/flagged-reviews')
    )

    expect(legacyReferences).toEqual([])
  })
})
