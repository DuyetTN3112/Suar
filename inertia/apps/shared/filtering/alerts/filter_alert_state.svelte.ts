import {
  FilterAlertClient,
  FilterAlertClientError,
  type CreateFilterAlertInput,
  type FilterAlertDto,
} from './filter_alert_client'

export function createFilterAlertState(options: { client?: FilterAlertClient } = {}) {
  const client = options.client ?? new FilterAlertClient()
  let viewId = $state<string | null>(null)
  let alert = $state<FilterAlertDto | null>(null)
  let subscribed = $state<boolean | null>(null)
  let loading = $state(false)
  let error = $state<FilterAlertClientError | null>(null)

  async function run<T>(operation: () => Promise<T>): Promise<T> {
    loading = true
    error = null
    try {
      return await operation()
    } catch (cause) {
      error = cause instanceof FilterAlertClientError
        ? cause
        : new FilterAlertClientError('UNKNOWN_ERROR', cause instanceof Error ? cause.message : String(cause))
      throw error
    } finally {
      loading = false
    }
  }

  async function load(nextViewId: string) {
    viewId = nextViewId
    alert = await run(() => client.getAlert(nextViewId))
    subscribed = alert !== null
    return alert
  }

  function setView(nextViewId: string) {
    viewId = nextViewId
    alert = null
    subscribed = null
    error = null
  }

  function reset() {
    viewId = null
    alert = null
    subscribed = null
    error = null
  }

  async function create(input: CreateFilterAlertInput) {
    if (!viewId) throw new FilterAlertClientError('UNKNOWN_ERROR', 'No saved view selected')
    const selectedViewId = viewId
    alert = await run(() => client.createAlert(selectedViewId, input))
    subscribed = true
    return alert
  }

  async function pause() {
    return update({ action: 'pause', expectedLockVersion: lockVersion() })
  }

  async function resume() {
    return update({ action: 'resume', expectedLockVersion: lockVersion() })
  }

  async function schedule(input: { intervalMinutes: number; timezone: string }) {
    return update({ action: 'schedule', expectedLockVersion: lockVersion(), ...input })
  }

  async function remove() {
    return update({ action: 'delete', expectedLockVersion: lockVersion() })
  }

  async function update(input: Parameters<FilterAlertClient['updateAlert']>[1]) {
    if (!viewId) throw new FilterAlertClientError('UNKNOWN_ERROR', 'No saved view selected')
    const selectedViewId = viewId
    alert = await run(() => client.updateAlert(selectedViewId, input))
    if (input.action === 'delete') subscribed = false
    return alert
  }

  function lockVersion(): number {
    return alert?.lockVersion ?? 1
  }

  return {
    get viewId() { return viewId },
    get alert() { return alert },
    get subscribed() { return subscribed },
    get loading() { return loading },
    get error() { return error },
    load,
    setView,
    reset,
    create,
    pause,
    resume,
    schedule,
    remove,
  }
}
