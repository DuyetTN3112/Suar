import AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import type {
  AdminSearchProjectionActivationApplyInput,
  AdminSearchProjectionCleanupInput,
  AdminSearchProjectionInspectInput,
  AdminSearchProjectionInventory,
  AdminSearchProjectionOperator,
  AdminSearchProjectionRollbackInput,
} from '#modules/http/public_contracts/admin_search_projection'

export interface AdminSearchProjectionAction<TInput, TOutput> {
  handle(input: TInput): Promise<TOutput>
  executeAndWrap?(input: TInput): Promise<Result<TOutput, AppException>>
}

export interface AdminSearchProjectionDependencies {
  authorize: AdminSearchProjectionAction<{ assertedActorId: string }, AdminSearchProjectionOperator | null>
  inspect: AdminSearchProjectionAction<AdminSearchProjectionInspectInput, unknown>
  previewCleanup: AdminSearchProjectionAction<AdminSearchProjectionCleanupInput, unknown>
  applyCleanup: AdminSearchProjectionAction<AdminSearchProjectionCleanupInput, unknown>
  previewRollback: AdminSearchProjectionAction<AdminSearchProjectionRollbackInput, unknown>
  applyRollback: AdminSearchProjectionAction<AdminSearchProjectionRollbackInput, unknown>
  previewActivation?: AdminSearchProjectionAction<{ id: string }, unknown>
  applyActivation?: AdminSearchProjectionAction<AdminSearchProjectionActivationApplyInput, unknown>
  reconcile?: AdminSearchProjectionAction<{ target: string }, unknown>
}

export function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw invalidRequest()
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

export function optionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^\d+$/.test(value.trim())
        ? Number(value.trim())
        : Number.NaN
  if (!Number.isSafeInteger(parsed)) throw invalidRequest()
  return parsed
}

export function requiredString(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) throw invalidRequest()
  return value.trim()
}

export function invalidRequest(): AppException {
  return new AppException('Invalid search projection operation request.', {
    status: 400,
    code: 'SEARCH_INDEX_OPERATION_INVALID',
    safeMessage: 'Invalid search projection operation request.',
  })
}

export function unsupportedOperation(operation: string): AppException {
  return new AppException(`Search projection ${operation} is not supported.`, {
    status: 501,
    code: 'SEARCH_INDEX_OPERATION_UNSUPPORTED',
    safeMessage: 'This search projection operation is not supported.',
    details: { operation },
  })
}

export function isSearchIndexAdministrationError(
  error: unknown
): error is Error & { code: string } {
  return (
    error instanceof Error &&
    error.name === 'SearchIndexAdministrationError' &&
    typeof (error as { code?: unknown }).code === 'string'
  )
}

export function toHttpException(error: Error & { code: string }): AppException {
  const conflictCodes = new Set([
    'SEARCH_INDEX_CLEANUP_PLAN_MISMATCH',
    'SEARCH_INDEX_CLEANUP_STATE_CHANGED',
    'SEARCH_INDEX_ROLLBACK_CURRENT_MISMATCH',
    'SEARCH_INDEX_ALIAS_STATE_INCONSISTENT',
  ])
  return new AppException('Search index administration operation was rejected.', {
    status: conflictCodes.has(error.code) ? 409 : 400,
    code: error.code,
    safeMessage: 'Search index administration operation was rejected.',
    details: { diagnosticCode: error.code },
  })
}

export function mapProjectionInventories(result: unknown) {
  const inventories = Array.isArray(result) ? (result as AdminSearchProjectionInventory[]) : []
  const generations = inventories.flatMap((inventory) =>
    inventory.generations.map((generation) => ({
      id: generation.indexName,
      target: inventory.target,
      generation: generation.indexName,
      status: generation.active ? ('active' as const) : ('unknown' as const),
      checkpoint: null,
      sourceEntityRevision: 'inventory',
      documentCount: generation.documentCount,
      expectedDocumentCount: null,
      completenessChecksum: null,
      updatedAt: generation.createdAt ?? new Date(0).toISOString(),
      blocker: generation.active
        ? undefined
        : 'Lifecycle evidence is not available from the current inventory adapter.',
    }))
  )
  return { inventories, generations }
}
