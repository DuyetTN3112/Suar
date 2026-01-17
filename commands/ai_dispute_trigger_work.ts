import { randomUUID } from 'node:crypto'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { sanitizeErrorLogText } from '#modules/errors/public_contracts/error_sanitization'
import { reconcileAiDisputeEvaluationsCommand } from '#composition/review_ai_dispute_composition'
import { processAiDisputeAutoQueueIntentsCommand } from '#composition/review_ai_dispute_auto_queue_composition'
import env from '#start/env'

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer)
      signal.removeEventListener('abort', finish)
      resolve()
    }
    const timer = setTimeout(finish, milliseconds)
    timer.unref()
    signal.addEventListener('abort', finish, { once: true })
  })
}

function hasShutdownStarted(signal: AbortSignal): boolean {
  return signal.aborted
}

export default class AiDisputeTriggerWorkCommand extends BaseCommand {
  static override commandName = 'ai-dispute:trigger-work'
  static override description = 'Reconcile and retry durable Clawagent dispute trigger deliveries'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Process one bounded batch and exit' })
  declare once: boolean

  @flags.number({ description: 'Idle polling interval in milliseconds' })
  declare pollMs?: number

  override async run(): Promise<void> {
    const pollMs = this.pollMs ?? env.get('CLAWAGENT_TRIGGER_POLL_MS', 1_000)
    if (!Number.isSafeInteger(pollMs) || pollMs < 100 || pollMs > 60_000) {
      this.logger.error('pollMs must be an integer between 100 and 60000')
      this.exitCode = 1
      return
    }

    const workerId = `ai-dispute-trigger-${randomUUID()}`
    const shutdown = new AbortController()
    const stop = () => {
      shutdown.abort()
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    this.logger.info('AI dispute trigger reconciliation worker started')

    try {
      while (!hasShutdownStarted(shutdown.signal)) {
        try {
          const autoQueueResult = await processAiDisputeAutoQueueIntentsCommand.executeBatch(
            workerId,
            shutdown.signal
          )
          if (hasShutdownStarted(shutdown.signal)) {
            break
          }
          const result = await reconcileAiDisputeEvaluationsCommand.execute(shutdown.signal)
          if (autoQueueResult.claimed > 0) {
            this.logger.info(
              `AI dispute auto-queue batch claimed=${String(
                autoQueueResult.claimed
              )} processed=${String(autoQueueResult.processed)} retried=${String(
                autoQueueResult.retried
              )} dead_lettered=${String(autoQueueResult.deadLettered)} lease_lost=${String(
                autoQueueResult.leaseLost
              )} shutdown_deferred=${String(autoQueueResult.shutdownDeferred)}`
            )
          }
          if (result.selected > 0 || result.recoveredStale > 0 || result.exhausted > 0) {
            this.logger.info(
              `AI dispute trigger batch selected=${String(
                result.selected
              )} accepted=${String(result.accepted)} retried=${String(
                result.retried
              )} permanent_failures=${String(
                result.permanentFailures
              )} recovered_stale=${String(result.recoveredStale)} exhausted=${String(
                result.exhausted
              )} skipped=${String(result.skipped)} shutdown_deferred=${String(
                result.shutdownDeferred
              )}`
            )
          }
          if (
            !hasShutdownStarted(shutdown.signal) &&
            (autoQueueResult.deadLettered > 0 ||
              autoQueueResult.leaseLost > 0 ||
              result.permanentFailures > 0 ||
              result.exhausted > 0 ||
              result.skipped > 0)
          ) {
            this.logger.error('AI dispute trigger reconciliation requires operator attention')
          }
          if (this.once) {
            if (
              autoQueueResult.deadLettered > 0 ||
              autoQueueResult.leaseLost > 0 ||
              result.permanentFailures > 0 ||
              result.exhausted > 0 ||
              result.skipped > 0
            ) {
              this.exitCode = 1
            }
            return
          }
          if (autoQueueResult.claimed === 0 && result.selected === 0) {
            await wait(pollMs, shutdown.signal)
          }
        } catch (error) {
          if (hasShutdownStarted(shutdown.signal)) {
            break
          }
          this.logger.error(
            `AI dispute trigger reconciliation failed: ${sanitizeErrorLogText(
              error instanceof Error ? error.message : error
            )}`
          )
          if (this.once) {
            this.exitCode = 1
            return
          }
          await wait(Math.max(pollMs, 5_000), shutdown.signal)
        }
      }
    } finally {
      process.removeListener('SIGINT', stop)
      process.removeListener('SIGTERM', stop)
      this.logger.info('AI dispute trigger reconciliation worker stopped')
    }
  }
}
