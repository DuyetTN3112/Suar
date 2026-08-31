import {
  SearchProjectionAdminApiError,
  SearchProjectionAdminClient,
} from './client'
import type {
  CleanupApplyInput,
  CleanupPreviewInput,
  ActivationApplyInput,
  SearchIndexActivationPreview,
  RollbackApplyInput,
  RollbackPreviewInput,
  SearchIndexCleanupPlan,
  SearchIndexInventory,
  SearchIndexRollbackPlan,
  SearchProjectionAdminSnapshot,
  SearchProjectionLoadingAction,
} from './types'

export function createSearchProjectionAdminState(options: {
  readonly client?: SearchProjectionAdminClient
} = {}) {
  const client = options.client ?? new SearchProjectionAdminClient()
  let inventories = $state<readonly SearchIndexInventory[]>([])
  let generations = $state<readonly import('./types').SearchProjectionGenerationView[]>([])
  let activeGenerationId = $state<string | null>(null)
  let preview = $state<import('./types').SearchProjectionPreview | null>(null)
  let cleanupPreview = $state<SearchIndexCleanupPlan | null>(null)
  let rollbackPreview = $state<SearchIndexRollbackPlan | null>(null)
  let stalePreview = $state<'cleanup' | 'rollback' | null>(null)
  let error = $state<string | null>(null)
  let loadingAction = $state<SearchProjectionLoadingAction>(null)

  async function run<T>(action: SearchProjectionLoadingAction, operation: () => Promise<T>): Promise<T> {
    loadingAction = action
    error = null
    try {
      return await operation()
    } catch (cause) {
      error = cause instanceof SearchProjectionAdminApiError
        ? cause.message
        : 'Search projection request failed.'
      throw cause
    } finally {
      loadingAction = null
    }
  }

  async function load(target?: string): Promise<readonly SearchIndexInventory[]> {
    const next = await run('load', () => client.inspect(target))
    inventories = next
    generations = next.flatMap((inventory) => inventory.generations.map((generation) => ({
      id: generation.indexName,
      target: inventory.target,
      generation: generation.indexName,
      status: generation.active ? 'active' : 'unknown',
      checkpoint: null,
      sourceEntityRevision: 'inventory',
      documentCount: generation.documentCount,
      expectedDocumentCount: null,
      completenessChecksum: null,
      updatedAt: generation.createdAt ?? new Date().toISOString(),
    })))
    activeGenerationId = generations.find((generation) => generation.status === 'active')?.id ?? null
    return next
  }

  async function previewCleanup(input: CleanupPreviewInput): Promise<SearchIndexCleanupPlan> {
    const next = await run('cleanup-preview', () => client.previewCleanup(input))
    cleanupPreview = next
    stalePreview = null
    return next
  }

  async function applyCleanup(input: CleanupApplyInput): Promise<SearchIndexCleanupPlan> {
    try {
      const next = await run('cleanup-apply', () => client.applyCleanup(input))
      cleanupPreview = null
      stalePreview = null
      inventories = next.inventories
      return next
    } catch (cause) {
      if (isConflict(cause)) stalePreview = 'cleanup'
      throw cause
    }
  }

  async function previewRollback(input: RollbackPreviewInput): Promise<SearchIndexRollbackPlan> {
    const next = await run('rollback-preview', () => client.previewRollback(input))
    rollbackPreview = next
    stalePreview = null
    return next
  }

  async function applyRollback(input: RollbackApplyInput): Promise<SearchIndexRollbackPlan> {
    try {
      const next = await run('rollback-apply', () => client.applyRollback(input))
      rollbackPreview = null
      stalePreview = null
      await load(input.target)
      return next
    } catch (cause) {
      if (isConflict(cause)) stalePreview = 'rollback'
      throw cause
    }
  }

  async function previewActivation(id: string): Promise<SearchIndexActivationPreview> {
    const next = await run('activation-preview', () => client.previewActivation(id))
    const candidate = next.candidate
    const candidateId = candidate && typeof candidate.id === 'string' ? candidate.id : id
    const lockVersion = next.expectedLockVersion
    preview = {
      kind: 'activate',
      generationId: candidateId,
      previewToken: next.expectedStateToken,
      isStale: next.blockers.length > 0,
      ...(next.blockers[0] ? { staleReason: next.blockers[0] } : {}),
      ...(lockVersion === null ? {} : { expectedLockVersion: lockVersion }),
      expectedCurrentIndexNames: next.activeIndexNames,
      expectedStateToken: next.expectedStateToken,
    }
    return next
  }

  async function applyActivation(input: ActivationApplyInput): Promise<Record<string, unknown>> {
    const next = await run('activation-apply', () => client.applyActivation(input))
    await load()
    return next
  }

  async function reconcile(target: import('./types').SearchIndexTarget): Promise<Record<string, unknown>> {
    const next = await run('reconcile', () => client.reconcile(target))
    await load(target)
    return next
  }

  return {
    get snapshot(): SearchProjectionAdminSnapshot {
      return {
        generations,
        activeGenerationId,
        preview,
        inventories,
        cleanupPreview,
        rollbackPreview,
        stalePreview,
        error,
        loadingAction,
      }
    },
    load,
    previewCleanup,
    applyCleanup,
    previewRollback,
    applyRollback,
    previewActivation,
    applyActivation,
    reconcile,
  }
}

function isConflict(error: unknown): boolean {
  return error instanceof SearchProjectionAdminApiError && error.status === 409
}
