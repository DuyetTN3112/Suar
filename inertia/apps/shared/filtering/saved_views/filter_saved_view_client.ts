import type { FilterCriteria, FilterPresentationState } from '../contracts'

export type SavedViewVisibility = 'private' | 'team' | 'organization'

export interface SavedViewGrantTarget {
  type: 'user' | 'organization' | 'team'
  id: string
}

export interface SavedViewGrant {
  target: SavedViewGrantTarget
  read: boolean
  edit: boolean
  share: boolean
  subscribe: boolean
}

export interface SavedViewShareScope {
  organizationId: string | null
  teamId: string | null
}

export type SavedViewShareTarget =
  | {
      type: 'organization'
      id: string
      label: string
    }
  | {
      type: 'team'
      id: string
      label: string
      organizationId: string
    }

export interface FilterSavedViewDto {
  id: string
  name: string
  description: string | null
  ownerId: string
  visibility: SavedViewVisibility
  organizationId: string | null
  teamId: string | null
  contextKey: string
  contextOwner: string
  schemaVersion: number
  criteria: FilterCriteria
  presentation: FilterPresentationState
  isDefault: boolean
  isPinned: boolean
  alertStatus: 'disabled' | 'active' | 'paused'
  alertReason: string | null
  lockVersion: number
  migrationState: 'current' | 'pending' | 'requires_repair' | 'blocked'
  grants?: SavedViewGrant[]
  canEdit: boolean
  canShare: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSavedViewInput {
  name: string
  description?: string | null
  contextKey: string
  contextOwner: string
  criteria: FilterCriteria
  presentation?: FilterPresentationState
  visibility?: SavedViewVisibility
  organizationId?: string | null
  teamId?: string | null
  isDefault?: boolean
  isPinned?: boolean
}

export interface UpdateSavedViewInput {
  name?: string
  description?: string | null
  criteria?: FilterCriteria
  presentation?: FilterPresentationState
  visibility?: SavedViewVisibility
  organizationId?: string | null
  teamId?: string | null
  isDefault?: boolean
  isPinned?: boolean
  expectedLockVersion: number
  repair?: boolean
}

export type SavedViewErrorCode =
  | 'DUPLICATE_NAME'
  | 'DUPLICATE_DEFAULT'
  | 'OPTIMISTIC_CONFLICT'
  | 'READ_ONLY'
  | 'ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'REQUIRES_REPAIR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR'

export class SavedViewClientError extends Error {
  constructor(
    public readonly code: SavedViewErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'SavedViewClientError'
  }
}

export interface FilterSavedViewClientOptions {
  baseUrl?: string
  fetchFn?: typeof fetch
}

export class FilterSavedViewClient {
  private baseUrl: string
  private fetchFn: typeof fetch

  constructor(options: FilterSavedViewClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '/api/v1/filter-saved-views'
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args))
  }

  private generateIdempotencyKey(): string {
    return `sv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    idempotencyKey?: string
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string>),
    }

    if (idempotencyKey) {
      headers['X-Idempotency-Key'] = idempotencyKey
    }

    try {
      const response = await this.fetchFn(url, { ...options, headers })

      if (!response.ok) {
        let errorData: { code?: string; message?: string; details?: Record<string, unknown> } = {}
        try {
          errorData = (await response.json()) as typeof errorData
        } catch {}

        const errorCode = errorData.code
          ? (errorData.code as SavedViewErrorCode)
          : this.mapHttpStatus(response.status)
        throw new SavedViewClientError(
          errorCode,
          errorData.message || `Request failed with status ${response.status}`,
          errorData.details
        )
      }

      if (response.status === 204) {
        // The 204 branch intentionally has no JSON payload; callers of mutation methods ignore it.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return {} as T
      }

      return (await response.json()) as T
    } catch (error) {
      if (error instanceof SavedViewClientError) {
        throw error
      }
      throw new SavedViewClientError('NETWORK_ERROR', (error as Error).message || 'Network error')
    }
  }

  private mapHttpStatus(status: number): SavedViewErrorCode {
    switch (status) {
      case 401:
      case 403:
        return 'ACCESS_DENIED'
      case 404:
        return 'NOT_FOUND'
      case 409:
        return 'OPTIMISTIC_CONFLICT'
      case 422:
        return 'DUPLICATE_NAME'
      default:
        return 'UNKNOWN_ERROR'
    }
  }

  async listSavedViews(contextKey: string): Promise<FilterSavedViewDto[]> {
    const data = await this.request<{ views: FilterSavedViewDto[] }>(`?context=${encodeURIComponent(contextKey)}`)
    return data.views
  }

  async getSavedView(id: string): Promise<FilterSavedViewDto> {
    const data = await this.request<{ view: FilterSavedViewDto }>(`/${encodeURIComponent(id)}`)
    return data.view
  }

  async createSavedView(input: CreateSavedViewInput): Promise<FilterSavedViewDto> {
    const idempotencyKey = this.generateIdempotencyKey()
    const data = await this.request<{ view: FilterSavedViewDto }>(
      '',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      idempotencyKey
    )
    return data.view
  }

  async updateSavedView(id: string, input: UpdateSavedViewInput): Promise<FilterSavedViewDto> {
    const data = await this.request<{ view: FilterSavedViewDto }>(
      `/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      }
    )
    return data.view
  }

  async deleteSavedView(id: string, expectedLockVersion: number): Promise<void> {
    await this.request<void>(`/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ expectedLockVersion }),
    })
  }

  async shareSavedView(
    id: string,
    grants: SavedViewGrant[],
    visibility: SavedViewVisibility,
    expectedLockVersion: number,
    scope: SavedViewShareScope
  ): Promise<FilterSavedViewDto> {
    const data = await this.request<{ view: FilterSavedViewDto }>(
      `/${encodeURIComponent(id)}/share`,
      {
        method: 'POST',
        body: JSON.stringify({
          grants,
          visibility,
          expectedLockVersion,
          organizationId: scope.organizationId,
          teamId: scope.teamId,
        }),
      }
    )
    return data.view
  }

  async duplicateSavedView(id: string, newName: string): Promise<FilterSavedViewDto> {
    const idempotencyKey = this.generateIdempotencyKey()
    const data = await this.request<{ view: FilterSavedViewDto }>(
      `/${encodeURIComponent(id)}/duplicate`,
      {
        method: 'POST',
        body: JSON.stringify({ name: newName }),
      },
      idempotencyKey
    )
    return data.view
  }

  async togglePin(id: string, isPinned: boolean, expectedLockVersion: number): Promise<FilterSavedViewDto> {
    return this.updateSavedView(id, { isPinned, expectedLockVersion })
  }

  async toggleDefault(id: string, isDefault: boolean, expectedLockVersion: number): Promise<FilterSavedViewDto> {
    return this.updateSavedView(id, { isDefault, isPinned: isDefault ? true : undefined, expectedLockVersion })
  }
}
