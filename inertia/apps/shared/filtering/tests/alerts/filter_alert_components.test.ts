import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import type { FilterAlertDto } from '../../alerts/filter_alert_client'
import { FilterAlertClient } from '../../alerts/filter_alert_client'
import { createFilterAlertState } from '../../alerts/filter_alert_state.svelte'
import FilterAlertStatusBadge from '../../components/alerts/filter_alert_status_badge.svelte'
import FilterAlertSubscriptionDialog from '../../components/alerts/filter_alert_subscription_dialog.svelte'
import SavedViewMenu from '../../components/saved_views/saved_view_menu.svelte'
import SavedViewRepairDialog from '../../components/saved_views/saved_view_repair_dialog.svelte'
import type { FilterCriteria } from '../../contracts'
import {
  FilterSavedViewClient,
  type FilterSavedViewDto,
} from '../../saved_views/filter_saved_view_client'
import { createSavedViewState } from '../../saved_views/filter_saved_view_state.svelte'

const activeAlert: FilterAlertDto = {
  id: 'alert-1',
  savedViewId: 'view-1',
  status: 'active',
  intervalMinutes: 30,
  timezone: 'UTC',
  nextRunAt: '2026-08-09T01:00:00.000Z',
  lastSuccessfulAt: null,
  pauseReason: null,
  lockVersion: 2,
}

describe('FilterAlertStatusBadge', () => {
  it('announces disabled, active, and paused states with honest labels', async () => {
    const { rerender } = render(FilterAlertStatusBadge, { props: { status: 'disabled' } })
    expect(screen.getByRole('status')).toHaveTextContent('Alerts off')

    await rerender({ status: 'active' })
    expect(screen.getByRole('status')).toHaveTextContent('Alerts on')

    await rerender({ status: 'paused', reason: 'taxonomy_requires_repair' })
    expect(screen.getByRole('status')).toHaveTextContent('Alerts paused')
    expect(screen.getByRole('status')).toHaveAccessibleDescription('taxonomy_requires_repair')
  })
})

describe('FilterAlertSubscriptionDialog', () => {
  it('subscribes with an explicit schedule and supports keyboard-close semantics', async () => {
    const onCreate = vi.fn().mockResolvedValue(activeAlert)
    const onClose = vi.fn()
    render(FilterAlertSubscriptionDialog, {
      props: {
        open: true,
        alert: null,
        loading: false,
        error: null,
        onClose,
        onCreate,
        onPause: vi.fn(),
        onResume: vi.fn(),
        onSchedule: vi.fn(),
        onDelete: vi.fn(),
      },
    })

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await fireEvent.input(screen.getByLabelText('Interval (minutes)'), { target: { value: '45' } })
    await fireEvent.input(screen.getByLabelText('Timezone'), { target: { value: 'Europe/Berlin' } })
    await fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Subscribe to alerts' })
    )

    expect(onCreate).toHaveBeenCalledWith({ intervalMinutes: 45, timezone: 'Europe/Berlin' })
    await fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows pause/resume and delete actions without implying delivery success', async () => {
    const onPause = vi.fn().mockResolvedValue({ ...activeAlert, status: 'paused' })
    const onDelete = vi.fn().mockResolvedValue(null)
    render(FilterAlertSubscriptionDialog, {
      props: {
        open: true,
        alert: activeAlert,
        loading: false,
        error: null,
        onClose: vi.fn(),
        onCreate: vi.fn(),
        onPause,
        onResume: vi.fn(),
        onSchedule: vi.fn(),
        onDelete,
      },
    })

    expect(
      screen.getByText(/notifications are sent only after an exact evaluation/i)
    ).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: 'Pause alerts' }))
    expect(onPause).toHaveBeenCalledOnce()
    await fireEvent.click(screen.getByRole('button', { name: 'Delete alert' }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('keeps the subscription dialog open and announces a failed create operation', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('Alert service unavailable'))
    render(FilterAlertSubscriptionDialog, {
      props: {
        open: true,
        alert: null,
        loading: false,
        error: null,
        onClose: vi.fn(),
        onCreate,
        onPause: vi.fn(),
        onResume: vi.fn(),
        onSchedule: vi.fn(),
        onDelete: vi.fn(),
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Subscribe to alerts' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Alert service unavailable')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('exposes schedule health without claiming a delivery snapshot', () => {
    const alert = {
      ...activeAlert,
      lastSuccessfulAt: '2026-08-09T00:30:00.000Z',
      pauseReason: 'taxonomy_requires_repair',
      status: 'paused' as const,
    }
    render(FilterAlertSubscriptionDialog, {
      props: {
        open: true,
        alert,
        loading: false,
        error: null,
        onClose: vi.fn(),
        onCreate: vi.fn(),
        onPause: vi.fn(),
        onResume: vi.fn(),
        onSchedule: vi.fn(),
        onDelete: vi.fn(),
      },
    })

    expect(screen.getByText('2026-08-09T01:00:00.000Z')).toBeInTheDocument()
    expect(screen.getByText('2026-08-09T00:30:00.000Z')).toBeInTheDocument()
    expect(screen.getByText('taxonomy_requires_repair')).toBeInTheDocument()
  })
})

describe('SavedViewRepairDialog', () => {
  it('requires an owner-selected taxonomy replacement and leaves a paused alert for explicit resume', async () => {
    const repairView: FilterSavedViewDto = {
      id: 'view-taxonomy-repair',
      name: 'Legacy skill alert',
      description: null,
      ownerId: 'user-1',
      visibility: 'private',
      organizationId: null,
      teamId: null,
      contextKey: 'talent.discovery',
      contextOwner: 'organization',
      schemaVersion: 2,
      criteria: {
        context: 'talent.discovery',
        schemaVersion: 2,
        filter: {
          kind: 'condition',
          field: 'taxonomy.skills',
          operator: 'any_of',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'hierarchy', termIds: ['legacy-skill'], expansion: 'descendants' },
        },
        sort: [],
        page: { size: 25 },
      },
      presentation: {},
      isDefault: false,
      isPinned: false,
      alertStatus: 'paused',
      alertReason: 'taxonomy_requires_repair',
      lockVersion: 4,
      migrationState: 'requires_repair',
      canEdit: true,
      canShare: true,
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
    }
    const onRepair = vi.fn().mockResolvedValue({ ...repairView, migrationState: 'current' })
    const onResumeAlert = vi.fn().mockResolvedValue(undefined)

    render(SavedViewRepairDialog, {
      props: {
        view: repairView,
        open: true,
        onClose: vi.fn(),
        onRepair,
        onResumeAlert,
      },
    })

    await fireEvent.input(screen.getByLabelText('Replace legacy-skill with'), {
      target: { value: 'skill-c' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Repair & Revalidate View' }))

    await waitFor(() => expect(onRepair).toHaveBeenCalledOnce())
    expect(onRepair).toHaveBeenCalledWith(
      'view-taxonomy-repair',
      expect.objectContaining({
        // Vitest's asymmetric matcher is intentionally untyped; the runtime assertion below is the contract.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        filter: expect.objectContaining({
          value: { kind: 'hierarchy', termIds: ['skill-c'], expansion: 'descendants' },
        }),
      })
    )
    expect(screen.getByRole('button', { name: 'Resume paused alert' })).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: 'Resume paused alert' }))
    expect(onResumeAlert).toHaveBeenCalledOnce()
  })
})

describe('SavedViewMenu alert integration', () => {
  it('revalidates an owner-selected taxonomy mapping before explicitly resuming the paused alert', async () => {
    const repairView: FilterSavedViewDto = {
      id: 'view-taxonomy-repair-menu',
      name: 'Legacy skill alert',
      description: null,
      ownerId: 'user-1',
      visibility: 'private',
      organizationId: null,
      teamId: null,
      contextKey: 'talent.discovery',
      contextOwner: 'organization',
      schemaVersion: 2,
      criteria: {
        context: 'talent.discovery',
        schemaVersion: 2,
        filter: {
          kind: 'condition',
          field: 'taxonomy.skills',
          operator: 'any_of',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'hierarchy', termIds: ['legacy-skill'], expansion: 'descendants' },
        },
        sort: [],
        page: { size: 25 },
      },
      presentation: {},
      isDefault: false,
      isPinned: false,
      alertStatus: 'paused',
      alertReason: 'taxonomy_requires_repair',
      lockVersion: 4,
      migrationState: 'requires_repair',
      canEdit: true,
      canShare: true,
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
    }
    const repairedView: FilterSavedViewDto = {
      ...repairView,
      criteria: {
        ...repairView.criteria,
        filter: {
          kind: 'condition',
          field: 'taxonomy.skills',
          operator: 'any_of',
          effect: 'require',
          unknown: 'exclude',
          value: { kind: 'hierarchy', termIds: ['skill-c'], expansion: 'descendants' },
        },
      },
      migrationState: 'current',
      lockVersion: 5,
    }
    const pausedAlert = { ...activeAlert, savedViewId: repairView.id, status: 'paused' as const, pauseReason: 'taxonomy_requires_repair', lockVersion: 7 }
    let listCalls = 0
    const fetchFn = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('?context=')) {
        listCalls += 1
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ views: [listCalls === 1 ? repairView : repairedView] }) })
      }
      if (url === `/api/v1/filter-saved-views/${repairView.id}` && options?.method === 'PUT') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ view: repairedView }) })
      }
      if (url === `/api/v1/filter-saved-views/${repairView.id}/alert` && !options?.method) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ alert: pausedAlert }) })
      }
      if (url === `/api/v1/filter-saved-views/${repairView.id}/alert` && options?.method === 'PUT') {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ alert: { ...pausedAlert, status: 'active', pauseReason: null, lockVersion: 8 } }) })
      }
      throw new Error(`Unexpected request ${url}`)
    })
    const savedViewState = createSavedViewState({ client: new FilterSavedViewClient({ fetchFn }) })
    const alertState = createFilterAlertState({ client: new FilterAlertClient({ fetchFn }) })
    const onApplyView = vi.fn()

    render(SavedViewMenu, {
      props: {
        contextKey: repairView.contextKey,
        currentCriteria: repairView.criteria,
        onApplyView,
        savedViewState,
        alertState,
      },
    })

    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved views menu' })).toBeInTheDocument())
    await fireEvent.click(screen.getByRole('button', { name: 'Saved views menu' }))
    await fireEvent.click(screen.getByTitle('Repair required'))
    await fireEvent.input(screen.getByLabelText('Replace legacy-skill with'), { target: { value: 'skill-c' } })
    await fireEvent.click(screen.getByRole('button', { name: 'Repair & Revalidate View' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Resume paused alert' })).toBeInTheDocument())
    expect(onApplyView).toHaveBeenCalledWith(
      expect.objectContaining({
        // Vitest's asymmetric matcher is intentionally untyped; the runtime assertion below is the contract.
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        filter: expect.objectContaining({ value: { kind: 'hierarchy', termIds: ['skill-c'], expansion: 'descendants' } }),
      }),
      {}
    )
    await fireEvent.click(screen.getByRole('button', { name: 'Resume paused alert' }))
    await waitFor(() => expect(fetchFn).toHaveBeenCalledWith(
      `/api/v1/filter-saved-views/${repairView.id}/alert`,
      expect.objectContaining({ method: 'PUT' })
    ))
  })

  it('hides sharing and alert actions when the context does not support them', async () => {
    const view: FilterSavedViewDto = {
      id: 'view-admin-audit',
      name: 'Security failures',
      description: null,
      ownerId: 'admin-1',
      visibility: 'private',
      organizationId: null,
      teamId: null,
      contextKey: 'admin.audit_logs',
      contextOwner: 'system',
      schemaVersion: 1,
      criteria: { context: 'admin.audit_logs', schemaVersion: 1, sort: [], page: { size: 25 } },
      presentation: {},
      isDefault: false,
      isPinned: false,
      alertStatus: 'disabled',
      alertReason: null,
      lockVersion: 1,
      migrationState: 'current',
      canEdit: false,
      canShare: false,
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
    }
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ views: [view] }),
    })
    const savedViewState = createSavedViewState({ client: new FilterSavedViewClient({ fetchFn }) })

    render(SavedViewMenu, {
      props: {
        contextKey: 'admin.audit_logs',
        currentCriteria: view.criteria,
        onApplyView: vi.fn(),
        savedViewState,
        capabilities: { sharedViews: false, alerts: false },
      },
    })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Saved views menu' })).toBeInTheDocument()
    )
    await fireEvent.click(screen.getByRole('button', { name: 'Saved views menu' }))
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Security failures' }))

    expect(
      screen.queryByRole('button', { name: /Subscribe to alerts|Manage alerts/i })
    ).not.toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: 'Saved views menu' }))
    expect(screen.queryByTitle('Share permissions')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Pin view')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Set as default view')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Delete view')).not.toBeInTheDocument()
  })

  it('subscribes from the saved-view menu and reflects the active alert state', async () => {
    const view: FilterSavedViewDto = {
      id: 'view-1',
      name: 'Open tasks',
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
      lockVersion: 1,
      migrationState: 'current',
      canEdit: true,
      canShare: true,
      createdAt: '2026-08-09T00:00:00.000Z',
      updatedAt: '2026-08-09T00:00:00.000Z',
    }
    const fetchFn = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
      if (url.includes('?context='))
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ views: [view] }),
        })
      if (options?.method === 'POST')
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ alert: activeAlert }),
        })
      throw new Error(`Unexpected request ${url}`)
    })
    const savedViewState = createSavedViewState({ client: new FilterSavedViewClient({ fetchFn }) })
    const alertState = createFilterAlertState({ client: new FilterAlertClient({ fetchFn }) })
    const criteria: FilterCriteria = {
      context: 'tasks.my_tasks',
      schemaVersion: 1,
      sort: [],
      page: { size: 25 },
    }

    render(SavedViewMenu, {
      props: {
        contextKey: 'tasks.my_tasks',
        currentCriteria: criteria,
        onApplyView: vi.fn(),
        savedViewState,
        alertState,
      },
    })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Saved views menu' })).toBeInTheDocument()
    )
    await fireEvent.click(screen.getByRole('button', { name: 'Saved views menu' }))
    await fireEvent.click(screen.getByRole('menuitem', { name: 'Open tasks' }))
    expect(screen.getByRole('status')).toHaveTextContent('Alerts off')
    await fireEvent.click(screen.getByRole('button', { name: 'Subscribe to alerts' }))
    await fireEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Subscribe to alerts' })
    )

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Alerts on'))
    expect(fetchFn).toHaveBeenCalledWith(
      '/api/v1/filter-saved-views/view-1/alert',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
