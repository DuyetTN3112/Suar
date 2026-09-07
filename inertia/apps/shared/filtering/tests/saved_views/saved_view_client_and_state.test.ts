import { describe, expect, it, vi } from 'vitest'

import type { FilterCriteria } from '../../contracts'
import {
  FilterSavedViewClient,
  SavedViewClientError,
  type FilterSavedViewDto,
} from '../../saved_views/filter_saved_view_client'
import { createSavedViewState } from '../../saved_views/filter_saved_view_state.svelte'

const sampleCriteria: FilterCriteria = {
  context: 'tasks.my_tasks',
  schemaVersion: 1,
  sort: [{ field: 'createdAt', direction: 'desc' }],
  page: { size: 25 },
}

const sampleViewDto: FilterSavedViewDto = {
  id: 'sv-101',
  name: 'High Priority Tasks',
  description: 'Tasks with high priority filter',
  ownerId: 'user-1',
  visibility: 'private',
  organizationId: null,
  teamId: null,
  contextKey: 'tasks.my_tasks',
  contextOwner: 'system',
  schemaVersion: 1,
  criteria: sampleCriteria,
  presentation: { view: 'table', density: 'compact' },
  isDefault: true,
  isPinned: true,
  alertStatus: 'disabled',
  alertReason: null,
  lockVersion: 1,
  migrationState: 'current',
  grants: [],
  canEdit: true,
  canShare: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

describe('FilterSavedViewClient', () => {
  it('lists saved views for a context key', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ views: [sampleViewDto] }), { status: 200 })
    )

    const client = new FilterSavedViewClient({ fetchFn: mockFetch })
    const result = await client.listSavedViews('tasks.my_tasks')

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('sv-101')
    const request = mockFetch.mock.calls[0]?.[1]
    expect(mockFetch.mock.calls[0]?.[0]).toBe('/api/v1/filter-saved-views?context=tasks.my_tasks')
    expect(new Headers(request?.headers).get('Accept')).toBe('application/json')
  })

  it('creates saved view with idempotency header', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ view: sampleViewDto }), { status: 201 })
    )

    const client = new FilterSavedViewClient({ fetchFn: mockFetch })
    const created = await client.createSavedView({
      name: 'High Priority Tasks',
      contextKey: 'tasks.my_tasks',
      contextOwner: 'system',
      criteria: sampleCriteria,
    })

    expect(created.id).toBe('sv-101')
    const request = mockFetch.mock.calls[0]?.[1]
    expect(mockFetch.mock.calls[0]?.[0]).toBe('/api/v1/filter-saved-views')
    expect(request?.method).toBe('POST')
    expect(new Headers(request?.headers).get('X-Idempotency-Key')).toMatch(/^sv_\d+_/)
  })

  it('maps HTTP errors to SavedViewClientError with proper codes', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ code: 'OPTIMISTIC_CONFLICT', message: 'Lock version mismatch' }), {
        status: 409,
      })
    )

    const client = new FilterSavedViewClient({ fetchFn: mockFetch })
    await expect(
      client.updateSavedView('sv-101', { name: 'Conflict', expectedLockVersion: 1 })
    ).rejects.toThrow(SavedViewClientError)
  })
})

describe('createSavedViewState', () => {
  it('manages loading, selection, and view updates in state store', async () => {
    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ views: [sampleViewDto] }), { status: 200 })
    )

    const client = new FilterSavedViewClient({ fetchFn: mockFetch })
    const state = createSavedViewState({ client })

    await state.loadViews('tasks.my_tasks')

    expect(state.views).toHaveLength(1)
    expect(state.pinnedViews).toHaveLength(1)
    expect(state.defaultView?.id).toBe('sv-101')

    const applyFn = vi.fn()
    state.selectView('sv-101', applyFn)

    expect(state.activeViewId).toBe('sv-101')
    expect(state.activeView?.name).toBe('High Priority Tasks')
    expect(applyFn).toHaveBeenCalledWith(sampleCriteria, { view: 'table', density: 'compact' })
  })

  it('handles repair state when a view requires repair', async () => {
    const repairView: FilterSavedViewDto = {
      ...sampleViewDto,
      id: 'sv-102',
      migrationState: 'requires_repair',
      alertStatus: 'paused',
      alertReason: 'migration_requires_repair',
    }

    const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ views: [repairView] }), { status: 200 })
    )

    const client = new FilterSavedViewClient({ fetchFn: mockFetch })
    const state = createSavedViewState({ client })

    await state.loadViews('tasks.my_tasks')
    expect(state.repairNeededView?.id).toBe('sv-102')
  })
})
