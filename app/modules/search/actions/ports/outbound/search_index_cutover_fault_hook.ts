import type { SearchProjectionGenerationStatus } from '#modules/search/domain/projection-generation/search_projection_generation'

export type SearchIndexCutoverFaultPoint = 'after_alias_swap' | 'after_ledger_transition'

export interface SearchIndexCutoverFaultEvent {
  readonly point: SearchIndexCutoverFaultPoint
  readonly operation: 'activation' | 'reconcile'
  readonly target: string
  readonly generationId: string
  readonly physicalIndexName: string
  readonly fromStatus?: SearchProjectionGenerationStatus
  readonly toStatus?: SearchProjectionGenerationStatus
  readonly lockVersion?: number
}

/**
 * Opt-in seam for deterministic tests of the alias/ledger failure windows.
 * Production callers omit it; injected errors are deliberately allowed to
 * propagate so the caller can model a process interruption and replay.
 */
export type SearchIndexCutoverFaultHook = (event: SearchIndexCutoverFaultEvent) => void | Promise<void>
