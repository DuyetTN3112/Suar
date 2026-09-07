import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import SavedViewShareDialog from '../../components/saved_views/saved_view_share_dialog.svelte'
import type { FilterSavedViewDto } from '../../saved_views/filter_saved_view_client'
import { FilterSavedViewClient } from '../../saved_views/filter_saved_view_client'
import { createSavedViewState } from '../../saved_views/filter_saved_view_state.svelte'

const view: FilterSavedViewDto = {
  id: 'saved-view-1',
  name: 'Open engineering work',
  description: null,
  ownerId: 'user-1',
  visibility: 'private',
  organizationId: null,
  teamId: null,
  contextKey: 'tasks.my_tasks',
  contextOwner: 'system',
  schemaVersion: 1,
  criteria: { context: 'tasks.my_tasks', schemaVersion: 1, sort: [], page: { size: 25 } },
  presentation: {},
  isDefault: false,
  isPinned: false,
  alertStatus: 'disabled',
  alertReason: null,
  lockVersion: 3,
  migrationState: 'current',
  grants: [],
  canEdit: true,
  canShare: true,
  createdAt: '2026-08-09T00:00:00.000Z',
  updatedAt: '2026-08-09T00:00:00.000Z',
}

function requestPayload(request: RequestInit | undefined): Record<string, unknown> {
  if (typeof request?.body !== 'string') throw new Error('Expected a JSON request body')
  return JSON.parse(request.body) as Record<string, unknown>
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

describe('FilterSavedViewClient sharing payload', () => {
  it('sends the selected organization or team scope identifiers with a share mutation', async () => {
    const fetchFn = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ view }), { status: 200 })
    )
    const client = new FilterSavedViewClient({ fetchFn })

    await client.shareSavedView(
      view.id,
      [{ target: { type: 'team', id: 'team-platform' }, read: true, edit: false, share: false, subscribe: false }],
      'team',
      view.lockVersion,
      { organizationId: 'org-acme', teamId: 'team-platform' }
    )

    const request = fetchFn.mock.calls[0]?.[1]
    expect(fetchFn.mock.calls[0]?.[0]).toBe('/api/v1/filter-saved-views/saved-view-1/share')
    expect(requestPayload(request)).toEqual({
      grants: [{ target: { type: 'team', id: 'team-platform' }, read: true, edit: false, share: false, subscribe: false }],
      visibility: 'team',
      expectedLockVersion: 3,
      organizationId: 'org-acme',
      teamId: 'team-platform',
    })
  })
})

describe('SavedViewShareDialog', () => {
  it('requires an explicit authorized target and derives a read grant for it', async () => {
    const onShare = vi.fn().mockResolvedValue(undefined)
    render(SavedViewShareDialog, {
      props: {
        view,
        open: true,
        onClose: vi.fn(),
        onShare,
        targets: [
          { type: 'organization', id: 'org-acme', label: 'Acme Inc.' },
          { type: 'team', id: 'team-platform', label: 'Platform team', organizationId: 'org-acme' },
        ],
        conflict: null,
        onReloadConflict: vi.fn(),
        onReapplyConflict: vi.fn(),
      },
    })

    await fireEvent.click(screen.getByRole('radio', { name: /team shared with members/i }))
    await fireEvent.click(screen.getByRole('radio', { name: /platform team/i }))
    await fireEvent.click(screen.getByRole('button', { name: 'Save Permissions' }))

    expect(onShare).toHaveBeenCalledWith(
      'saved-view-1',
      [{ target: { type: 'team', id: 'team-platform' }, read: true, edit: false, share: false, subscribe: false }],
      'team',
      { organizationId: 'org-acme', teamId: 'team-platform' }
    )
  })

  it('shows reload then explicit reapply recovery after a concurrency conflict', async () => {
    const onReloadConflict = vi.fn().mockResolvedValue(undefined)
    const onReapplyConflict = vi.fn().mockResolvedValue(undefined)
    render(SavedViewShareDialog, {
      props: {
        view,
        open: true,
        onClose: vi.fn(),
        onShare: vi.fn().mockRejectedValue(new Error('View changed elsewhere')),
        targets: [{ type: 'organization', id: 'org-acme', label: 'Acme Inc.' }],
        conflict: {
          viewId: view.id,
          attempted: {
            grants: [],
            visibility: 'private',
            scope: { organizationId: null, teamId: null },
          },
          latest: null,
        },
        onReloadConflict,
        onReapplyConflict,
      },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(/changed elsewhere/i)
    const reapply = screen.getByRole('button', { name: 'Reapply my permissions' })
    expect(reapply).toBeDisabled()
    await fireEvent.click(screen.getByRole('button', { name: 'Reload latest permissions' }))
    await waitFor(() => expect(onReloadConflict).toHaveBeenCalledOnce())
  })
})

describe('createSavedViewState share conflicts', () => {
  it("reloads the latest lock version before reapplying the user's share mutation", async () => {
    const latest = { ...view, lockVersion: 4, visibility: 'organization' as const, organizationId: 'org-acme' }
    let shareRequests = 0
    const fetchFn = vi.fn<typeof fetch>().mockImplementation((url, options) => {
      const urlText = requestUrl(url)
      if (urlText.includes('?context=')) {
        return Promise.resolve(new Response(JSON.stringify({ views: [view] }), { status: 200 }))
      }
      if (options?.method === 'POST') {
        shareRequests += 1
        if (shareRequests === 2) {
          return Promise.resolve(new Response(JSON.stringify({ view: latest }), { status: 200 }))
        }
        return Promise.resolve(
          new Response(JSON.stringify({ code: 'OPTIMISTIC_CONFLICT', message: 'View changed elsewhere' }), { status: 409 })
        )
      }
      if (urlText.endsWith('/saved-view-1')) {
        return Promise.resolve(new Response(JSON.stringify({ view: latest }), { status: 200 }))
      }
      throw new Error(`Unexpected request ${urlText}`)
    })
    const state = createSavedViewState({ client: new FilterSavedViewClient({ fetchFn }) })
    await state.loadViews('tasks.my_tasks')

    await expect(
      state.shareView(
        view.id,
        [{ target: { type: 'organization', id: 'org-acme' }, read: true, edit: false, share: false, subscribe: false }],
        'organization',
        { organizationId: 'org-acme', teamId: null }
      )
    ).rejects.toThrow('View changed elsewhere')
    expect(state.shareConflict?.latest).toBeNull()

    await state.reloadShareConflict()
    expect(state.shareConflict?.latest?.lockVersion).toBe(4)
    await state.reapplyShareConflict()

    const retry = fetchFn.mock.calls.find(([, options]) =>
      options?.method === 'POST' && requestPayload(options).expectedLockVersion === 4
    )
    expect(retry).toBeDefined()
    expect(state.shareConflict).toBeNull()
  })
})
