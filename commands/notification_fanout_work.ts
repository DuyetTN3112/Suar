import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import {
  bindNotificationFanoutShutdownSignals,
  waitForNotificationFanoutPoll,
} from '#composition/command_support/notification_fanout_runtime'
import { notificationApplication } from '#composition/notifications/notification-feed/notification_composition'
import notificationConfig from '#config/notification'
import { sanitizeErrorLogText } from '#modules/errors/public_contracts/error_sanitization'
import { NotificationFanoutWorker } from '#modules/notifications/infra/adapters/notification-outbox/notification_fanout_worker'

function isAbortRequested(signal: AbortSignal): boolean {
  return signal.aborted
}

export default class NotificationFanoutWorkCommand extends BaseCommand {
  static override commandName = 'notification:fanout-work'
  static override description =
    'Materialize durable notification fanout targets into canonical notifications'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Drain one bounded batch and exit' })
  declare once: boolean

  @flags.number({ description: 'Maximum targets claimed per batch (hard maximum 100)' })
  declare batchSize?: number

  @flags.number({ description: 'Maximum concurrent database transactions (hard maximum 8)' })
  declare concurrency?: number

  @flags.number({ description: 'Idle polling interval in milliseconds' })
  declare pollMs?: number

  override async run(): Promise<void> {
    const workerId = `${hostname()}:${process.pid}:${randomUUID()}`
    const worker = new NotificationFanoutWorker({
      workerId,
      acceptance: notificationApplication,
      batchSize: this.batchSize ?? notificationConfig.fanoutBatchSize,
      concurrency: this.concurrency ?? notificationConfig.fanoutConcurrency,
      leaseDurationMs: notificationConfig.fanoutLeaseDurationMs,
      maxAttempts: notificationConfig.fanoutMaxAttempts,
      retryBaseMs: notificationConfig.fanoutRetryBaseMs,
      retryCapMs: notificationConfig.fanoutRetryCapMs,
    })
    const pollMs = this.pollMs ?? notificationConfig.fanoutPollMs
    if (!Number.isSafeInteger(pollMs) || pollMs < 100 || pollMs > 60_000) {
      this.logger.error('pollMs must be an integer between 100 and 60000')
      this.exitCode = 1
      return
    }

    const shutdownController = new AbortController()
    const removeShutdownListeners = bindNotificationFanoutShutdownSignals(shutdownController)
    this.logger.info(
      `Notification fanout worker started worker=${workerId} batch=${String(
        this.batchSize ?? notificationConfig.fanoutBatchSize
      )} concurrency=${String(this.concurrency ?? notificationConfig.fanoutConcurrency)}`
    )

    try {
      while (!isAbortRequested(shutdownController.signal)) {
        try {
          const result = await worker.runOnce({ signal: shutdownController.signal })
          if (result.claimed > 0) {
            this.logger.info(
              `Notification fanout batch claimed=${String(
                result.claimed
              )} processed=${String(result.processed)} retried=${String(
                result.retried
              )} dead_lettered=${String(result.deadLettered)} lease_lost=${String(
                result.leaseLost
              )} aborted=${String(result.aborted ?? 0)}`
            )
          }
          if (result.deadLettered > 0 || result.leaseLost > 0) {
            this.logger.error(
              'Notification fanout requires operator attention: dead-letter or lease loss detected'
            )
          }
          if (this.once) {
            if (result.deadLettered > 0 || result.leaseLost > 0) {
              this.exitCode = 1
            }
            return
          }
          if (result.claimed === 0) {
            await waitForNotificationFanoutPoll(pollMs, shutdownController.signal)
          }
        } catch (error) {
          if (isAbortRequested(shutdownController.signal)) {
            break
          }
          this.logger.error(
            `Notification fanout worker iteration failed: ${sanitizeErrorLogText(
              error instanceof Error ? error.message : error
            )}`
          )
          if (this.once) {
            this.exitCode = 1
            return
          }
          await waitForNotificationFanoutPoll(Math.max(pollMs, 5_000), shutdownController.signal)
        }
      }
    } finally {
      removeShutdownListeners()
      this.logger.info('Notification fanout worker stopped')
    }
  }
}
