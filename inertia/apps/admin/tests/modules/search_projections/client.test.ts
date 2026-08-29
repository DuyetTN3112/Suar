import { describe, expect, it, vi } from 'vitest'

import { SearchProjectionAdminClient } from '@/apps/admin/modules/search_projections/client'

function response(body: unknown, status = 200): Response {
  const result = {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response
  return result
}

describe('SearchProjectionAdminClient', () => {
  it('uses the fenced activation preview/apply HTTP boundary and does not expose provider details', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ data: { mode: 'preview', expectedStateToken: 'opaque' } }))
      .mockResolvedValueOnce(response({ data: { status: 'active' } }))
    const client = new SearchProjectionAdminClient({ fetchFn })

    await client.previewActivation('generation-1')
    await client.applyActivation({
      id: 'generation-1',
      expectedLockVersion: 2,
      expectedCurrentIndexNames: ['suar_tasks_v1'],
      expectedStateToken: 'opaque',
      now: '2026-08-09T00:02:00.000Z',
    })

    expect(fetchFn).toHaveBeenNthCalledWith(
      1,
      '/api/admin/search-projections/activation/preview?id=generation-1',
      expect.objectContaining({ credentials: 'same-origin' })
    )
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      '/api/admin/search-projections/activation/apply',
      expect.objectContaining({ method: 'POST' })
    )
    const options = fetchFn.mock.calls[1]?.[1]
    const body = options && typeof options === 'object' && 'body' in options ? options.body : ''
    expect(typeof body === 'string' ? body : '').not.toMatch(/elasticsearch|password|credential/i)
  })

  it('normalizes non-JSON and server failures into a safe typed error', async () => {
    const client = new SearchProjectionAdminClient({
      fetchFn: vi.fn<typeof fetch>().mockResolvedValue(response({ detail: 'safe rejection' }, 409)),
    })

    await expect(client.previewActivation('generation-1')).rejects.toEqual(
      expect.objectContaining({
        status: 409,
        message: 'Search projection request was rejected.',
      })
    )
  })
})
