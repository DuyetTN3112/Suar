import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import loggerService, {
  type SanitizingLogger,
} from '#modules/logger/public_contracts/application_logger'

const SAFE_CONTEXT_COMPONENT = /^[a-z][a-z0-9_.-]{0,127}$/

export interface RollbackCapableTransaction {
  readonly isCompleted: boolean
  rollback(): Promise<void>
}

export interface TransactionRollbackContext {
  readonly module: string
  readonly operation: string
}

export type TransactionRollbackOutcome = 'already_completed' | 'rolled_back' | 'rollback_failed'

type TransactionRollbackLogger = Pick<SanitizingLogger, 'logStructured'>

function safeContextComponent(value: string): string {
  return SAFE_CONTEXT_COMPONENT.test(value) ? value : 'unknown'
}

function errorClass(error: unknown): string {
  const serialized = serializeObservabilityError(error)
  const className = serialized?.['class']
  return typeof className === 'string' ? className : 'UnknownError'
}

/**
 * Attempts a caller-owned transaction rollback without allowing a secondary
 * rollback or telemetry failure to replace the primary application error.
 *
 * Callers must rethrow the original error after this function returns.
 */
export async function rollbackWithoutMaskingOriginalError(
  transaction: RollbackCapableTransaction,
  originalError: unknown,
  context: TransactionRollbackContext,
  operationalLogger: TransactionRollbackLogger = loggerService
): Promise<TransactionRollbackOutcome> {
  try {
    if (transaction.isCompleted) {
      return 'already_completed'
    }

    await transaction.rollback()
    return 'rolled_back'
  } catch (rollbackError) {
    try {
      operationalLogger.logStructured('error', 'database.transaction.rollback_failed', {
        module: safeContextComponent(context.module),
        operation: safeContextComponent(context.operation),
        original_error_class: errorClass(originalError),
        rollback_error_class: errorClass(rollbackError),
        original_error_preserved: true,
      })
    } catch {
      // Telemetry is best-effort. The caller must still rethrow the exact
      // primary error even when the logging sink is unavailable.
    }

    return 'rollback_failed'
  }
}
