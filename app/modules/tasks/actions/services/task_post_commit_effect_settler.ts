import loggerService from '#modules/logger/public_contracts/application_logger'

/** Settles named application effects after a task transaction commits. */
export interface TaskPostCommitEffect {
  name: string
  run(): Promise<void>
}

export interface TaskPostCommitFailure {
  effect: string
  errorType: string
}

export interface TaskPostCommitReport {
  attempted: number
  succeeded: number
  failures: TaskPostCommitFailure[]
}

interface TaskPostCommitLogger {
  error(message: string, payload: Record<string, unknown>): void
}

interface SettleTaskPostCommitEffectsInput {
  operation: string
  context: Record<string, unknown>
  effects: TaskPostCommitEffect[]
  logger?: TaskPostCommitLogger
}

function describeFailure(effect: string, reason: unknown): TaskPostCommitFailure {
  if (reason instanceof Error) {
    return {
      effect,
      errorType: reason.name,
    }
  }

  return {
    effect,
    errorType: typeof reason,
  }
}

/**
 * Runs independent work after a database commit without turning an already
 * committed mutation into an HTTP failure.
 *
 * Cache correctness is backed by the transactional cache-invalidation outbox.
 * In-process events remain best-effort until a domain-event outbox is available,
 * so every failure is surfaced as structured operational telemetry.
 */
export async function settleTaskPostCommitEffects(
  input: SettleTaskPostCommitEffectsInput
): Promise<TaskPostCommitReport> {
  const settled = await Promise.allSettled(
    input.effects.map(async (effect) => {
      await effect.run()
    })
  )
  const failures: TaskPostCommitFailure[] = []

  settled.forEach((result, index) => {
    const effect = input.effects.at(index)
    if (effect && result.status === 'rejected') {
      failures.push(describeFailure(effect.name, result.reason))
    }
  })

  if (failures.length > 0) {
    try {
      ;(input.logger ?? loggerService).error('[TaskPostCommit] Deferred effects failed', {
        operation: input.operation,
        committed: true,
        ...input.context,
        failures,
      })
    } catch {
      // Logging must never change the outcome of an already committed mutation.
    }
  }

  return {
    attempted: input.effects.length,
    succeeded: input.effects.length - failures.length,
    failures,
  }
}
