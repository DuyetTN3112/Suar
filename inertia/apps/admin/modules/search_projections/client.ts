import type {
  CleanupApplyInput,
  CleanupPreviewInput,
  RollbackApplyInput,
  RollbackPreviewInput,
  SearchIndexCleanupPlan,
  SearchIndexActivationPreview,
  SearchIndexInventory,
  SearchIndexRollbackPlan,
  ActivationApplyInput,
} from './types'

export const SEARCH_INDEX_CLEANUP_CONFIRMATION = 'DELETE_RETIRED_SEARCH_INDICES'
export const SEARCH_INDEX_ROLLBACK_CONFIRMATION = 'ROLLBACK_SEARCH_INDEX'

export type SearchProjectionAdminClientOptions = {
  readonly baseUrl?: string
  readonly fetchFn?: typeof fetch
}

export class SearchProjectionAdminApiError extends Error {
  override readonly name = 'SearchProjectionAdminApiError'

  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string
  ) {
    super(message)
  }
}

export class SearchProjectionAdminClient {
  private readonly baseUrl: string
  private readonly fetchFn: typeof fetch

  constructor(options: SearchProjectionAdminClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? '/api/admin/search-projections'
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args))
  }

  async inspect(target?: string): Promise<readonly SearchIndexInventory[]> {
    const query = target ? `?target=${encodeURIComponent(target)}` : ''
    return this.request<readonly SearchIndexInventory[]>(`${this.baseUrl}${query}`)
  }

  async previewCleanup(input: CleanupPreviewInput): Promise<SearchIndexCleanupPlan> {
    return this.request<SearchIndexCleanupPlan>(
      `${this.baseUrl}/cleanup/preview${toQuery(input as Record<string, unknown>)}`
    )
  }

  async applyCleanup(input: CleanupApplyInput): Promise<SearchIndexCleanupPlan> {
    return this.request<SearchIndexCleanupPlan>(`${this.baseUrl}/cleanup/apply`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async previewRollback(input: RollbackPreviewInput): Promise<SearchIndexRollbackPlan> {
    return this.request<SearchIndexRollbackPlan>(
      `${this.baseUrl}/rollback/preview${toQuery(input as unknown as Record<string, unknown>)}`
    )
  }

  async applyRollback(input: RollbackApplyInput): Promise<SearchIndexRollbackPlan> {
    return this.request<SearchIndexRollbackPlan>(`${this.baseUrl}/rollback/apply`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async previewActivation(id: string): Promise<SearchIndexActivationPreview> {
    return this.request<SearchIndexActivationPreview>(
      `${this.baseUrl}/activation/preview?id=${encodeURIComponent(id)}`
    )
  }

  async applyActivation(input: ActivationApplyInput): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`${this.baseUrl}/activation/apply`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  }

  async reconcile(target: import('./types').SearchIndexTarget): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>(`${this.baseUrl}/reconcile`, {
      method: 'POST',
      body: JSON.stringify({ target }),
    })
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    let response: Response
    try {
      response = await this.fetchFn(url, {
        credentials: 'same-origin',
        ...options,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(options.headers as Record<string, string> | undefined),
        },
      })
    } catch {
      throw new SearchProjectionAdminApiError(0, 'NETWORK_ERROR', 'Search projection request failed.')
    }

    const body = await readJson(response)
    if (!response.ok) {
      const bodyRecord = isRecord(body) ? body : null
      const error = isRecord(bodyRecord?.error) ? bodyRecord.error : bodyRecord
      const code = typeof error?.code === 'string' ? error.code : null
      const message = typeof error?.message === 'string'
        ? error.message
        : 'Search projection request was rejected.'
      throw new SearchProjectionAdminApiError(response.status, code, message)
    }

    if (!isRecord(body) || !('data' in body)) {
      throw new SearchProjectionAdminApiError(200, 'INVALID_RESPONSE', 'Search projection response was invalid.')
    }
    return body.data as T
  }
}

function toQuery(input: Record<string, unknown>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, typeof value === 'string' ? value : JSON.stringify(value))
    }
  }
  const encoded = query.toString()
  return encoded ? `?${encoded}` : ''
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
