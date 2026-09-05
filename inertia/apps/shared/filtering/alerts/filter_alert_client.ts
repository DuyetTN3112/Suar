export type FilterAlertStatus = 'active' | 'paused'

export interface FilterAlertDto {
  id: string
  savedViewId: string
  status: FilterAlertStatus
  intervalMinutes: number
  timezone: string
  nextRunAt: string
  lastSuccessfulAt: string | null
  pauseReason: string | null
  lockVersion: number
}

export interface CreateFilterAlertInput {
  intervalMinutes: number
  timezone: string
}

export type FilterAlertAction =
  | { action: 'pause'; expectedLockVersion: number }
  | { action: 'resume'; expectedLockVersion: number }
  | { action: 'schedule'; expectedLockVersion: number; intervalMinutes: number; timezone: string }
  | { action: 'delete'; expectedLockVersion: number }

export type FilterAlertClientErrorCode =
  | 'ALERT_POLICY_DENIED'
  | 'OPTIMISTIC_CONFLICT'
  | 'ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

export class FilterAlertClientError extends Error {
  constructor(
    public readonly code: FilterAlertClientErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'FilterAlertClientError'
  }
}

export interface FilterAlertClientOptions {
  baseUrl?: string
  fetchFn?: typeof fetch
}

export class FilterAlertClient {
  private readonly baseUrl: string
  private readonly fetchFn: typeof fetch

  constructor(options: FilterAlertClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '/api/v1/filter-saved-views'
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args))
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers as Record<string, string> | undefined),
      },
    }).catch((error: unknown) => {
      throw new FilterAlertClientError(
        'NETWORK_ERROR',
        error instanceof Error ? error.message : 'Network error'
      )
    })

    if (!response.ok) {
      let body: { code?: string; message?: string; details?: Record<string, unknown> } = {}
      try {
        body = (await response.json()) as typeof body
      } catch {
        // Preserve the HTTP status mapping when the server has no JSON body.
      }
      throw new FilterAlertClientError(
        this.mapStatus(response.status, body.code),
        body.message ?? `Alert request failed with status ${response.status}`,
        body.details
      )
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    if (response.status === 204) return {} as T
    return (await response.json()) as T
  }

  private mapStatus(status: number, code?: string): FilterAlertClientErrorCode {
    if (code === 'ALERT_POLICY_DENIED') return 'ALERT_POLICY_DENIED'
    if (status === 401 || status === 403) return 'ACCESS_DENIED'
    if (status === 404) return 'NOT_FOUND'
    if (status === 409) return 'OPTIMISTIC_CONFLICT'
    return 'UNKNOWN_ERROR'
  }

  async getAlert(viewId: string): Promise<FilterAlertDto | null> {
    try {
      const data = await this.request<{ alert: FilterAlertDto }>(
        `/${encodeURIComponent(viewId)}/alert`
      )
      return data.alert
    } catch (error) {
      if (error instanceof FilterAlertClientError && error.code === 'NOT_FOUND') return null
      throw error
    }
  }

  async createAlert(viewId: string, input: CreateFilterAlertInput): Promise<FilterAlertDto> {
    const data = await this.request<{ alert: FilterAlertDto }>(
      `/${encodeURIComponent(viewId)}/alert`,
      { method: 'POST', body: JSON.stringify(input) }
    )
    return data.alert
  }

  async updateAlert(viewId: string, input: FilterAlertAction): Promise<FilterAlertDto | null> {
    if (input.action === 'delete') {
      await this.request<void>(`/${encodeURIComponent(viewId)}/alert`, {
        method: 'DELETE',
        body: JSON.stringify(input),
      })
      return null
    }
    const data = await this.request<{ alert: FilterAlertDto }>(
      `/${encodeURIComponent(viewId)}/alert`,
      { method: 'PUT', body: JSON.stringify(input) }
    )
    return data.alert
  }
}
