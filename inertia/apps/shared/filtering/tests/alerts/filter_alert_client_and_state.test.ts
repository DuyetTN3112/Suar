import { describe, expect, it, vi } from 'vitest'

import {
  FilterAlertClient,
  type FilterAlertDto,
  type FilterAlertClientError,
} from '../../alerts/filter_alert_client'
import { createFilterAlertState } from '../../alerts/filter_alert_state.svelte'

const activeAlert: FilterAlertDto = {
  id: 'alert-1',
  savedViewId: 'view-1',
  status: 'active',
  intervalMinutes: 30,
  timezone: 'UTC',
  nextRunAt: '2026-08-09T01:00:00.000Z',
  lastSuccessfulAt: null,
  pauseReason: null,
  lockVersion: 1,
}

describe('FilterAlertClient', () => {
  it('creates an alert with schedule and maps policy failures', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ alert: activeAlert }),
    })
    const client = new FilterAlertClient({ fetchFn })

    const result = await client.createAlert('view-1', { intervalMinutes: 30, timezone: 'UTC' })

    expect(result).toEqual(activeAlert)
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/v1/filter-saved-views/view-1/alert',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ intervalMinutes: 30, timezone: 'UTC' }),
      })
    )

    fetchFn.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ code: 'ALERT_POLICY_DENIED', message: 'Alert is unavailable' }),
    })
    await expect(client.createAlert('view-1', { intervalMinutes: 30, timezone: 'UTC' })).rejects.toEqual(
      expect.objectContaining<Partial<FilterAlertClientError>>({ code: 'ALERT_POLICY_DENIED' })
    )
  })

  it('uses optimistic-lock actions for pause and delete', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ alert: { ...activeAlert, status: 'paused', pauseReason: 'manual' } }),
    })
    const client = new FilterAlertClient({ fetchFn })

    await client.updateAlert('view-1', { action: 'pause', expectedLockVersion: 4 })

    expect(fetchFn).toHaveBeenCalledWith(
      '/api/v1/filter-saved-views/view-1/alert',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ action: 'pause', expectedLockVersion: 4 }),
      })
    )
  })
})

describe('createFilterAlertState', () => {
  it('tracks lifecycle state and clears the alert after delete', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ alert: activeAlert }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ alert: { ...activeAlert, status: 'paused', pauseReason: 'manual' } }) })
      .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}) })
    const state = createFilterAlertState({ client: new FilterAlertClient({ fetchFn }) })

    await state.load('view-1')
    expect(state.alert?.status).toBe('active')

    await state.pause()
    expect(state.alert?.status).toBe('paused')
    await state.remove()
    expect(state.alert).toBeNull()
    expect(state.subscribed).toBe(false)
    expect(state.error).toBeNull()
  })
})
