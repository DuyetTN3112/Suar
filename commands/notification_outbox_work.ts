import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import notificationOutboxConfig from '#config/notification'
import { sanitizeErrorLogText } from '#modules/errors/public_contracts/error_sanitization'
import { NotificationRealtimeProjectionNotifier } from '#modules/notifications/infra/adapters/notification_realtime_projection_notifier'
import { NotificationFeedProjectionHandler } from '#modules/notifications/infra/projections/notification_feed_projection_handler'
import { NotificationUnreadProjectionHandler } from '#modules/notifications/infra/projections/notification_unread_projection_handler'
import { PostgresNotificationUnreadStateReader } from '#modules/notifications/infra/repositories/postgres_notification_unread_state_reader'
import { NotificationOutboxWorker } from '#modules/notifications/infra/workers/notification_outbox_worker'

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds)
    timer.unref()
  })
}

export default class NotificationOutboxWorkCommand extends BaseCommand {
  static override commandName = 'notification:outbox-work'
  static override description =
    'Drain the durable notification outbox into Elasticsearch and Redis projections'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Drain one bounded batch and exit' })
  declare once: boolean

  @flags.number({ description: 'Maximum rows claimed per batch (hard maximum 100)' })
  declare batchSize?: number

  @flags.number({ description: 'Maximum concurrent deliveries (hard maximum 8)' })
  declare concurrency?: number

  @flags.number({ description: 'Idle polling interval in milliseconds' })
  declare pollMs?: number

  override async run(): Promise<void> {
    const workerId = `${hostname()}:${process.pid}:${randomUUID()}`
    const feedHandler = new NotificationFeedProjectionHandler()
    const unreadHandler = new NotificationUnreadProjectionHandler(
      undefined,
      new PostgresNotificationUnreadStateReader()
    )
    const realtime = new NotificationRealtimeProjectionNotifier()
    const worker = new NotificationOutboxWorker({
      workerId,
      handlers: {
        feed_search: realtime.decorate(feedHandler.deliver),
        unread_cache: realtime.decorate(unreadHandler.deliver),
      },
      batchSize: this.batchSize ?? notificationOutboxConfig.batchSize,
      concurrency: this.concurrency ?? notificationOutboxConfig.concurrency,
      leaseDurationMs: notificationOutboxConfig.leaseDurationMs,
      heartbeatIntervalMs: notificationOutboxConfig.heartbeatIntervalMs,
      handlerDeadlineMs: notificationOutboxConfig.handlerDeadlineMs,
      maxAttempts: notificationOutboxConfig.maxAttempts,
      retryBaseMs: notificationOutboxConfig.retryBaseMs,
      retryCapMs: notificationOutboxConfig.retryCapMs,
    })
    const pollMs = this.pollMs ?? notificationOutboxConfig.pollMs
    if (!Number.isSafeInteger(pollMs) || pollMs < 100 || pollMs > 60_000) {
      this.logger.error('pollMs must be an integer between 100 and 60000')
      this.exitCode = 1
      return
    }

    const lifecycle = { stopping: false }
    const stop = () => {
      lifecycle.stopping = true
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    this.logger.info(
      `Notification outbox worker started worker=${workerId} batch=${String(
        this.batchSize ?? notificationOutboxConfig.batchSize
      )} concurrency=${String(this.concurrency ?? notificationOutboxConfig.concurrency)}`
    )

    try {
      while (!lifecycle.stopping) {
        try {
          const result = await worker.runOnce()
          if (result.claimed > 0) {
            this.logger.info(
              `Notification outbox batch claimed=${String(
                result.claimed
              )} processed=${String(result.processed)} retried=${String(
                result.retried
              )} dead_lettered=${String(result.deadLettered)} lease_lost=${String(
                result.leaseLost
              )}`
            )
          }
          if (result.deadLettered > 0 || result.leaseLost > 0) {
            this.logger.error(
              'Notification outbox requires operator attention: dead-letter or lease loss detected'
            )
          }
          if (this.once) {
            if (result.deadLettered > 0 || result.leaseLost > 0) {
              this.exitCode = 1
            }
            return
          }
          if (result.claimed === 0) {
            await wait(pollMs)
          }
        } catch (error) {
          this.logger.error(
            `Notification outbox worker iteration failed: ${sanitizeErrorLogText(
              error instanceof Error ? error.message : error
            )}`
          )
          if (this.once) {
            this.exitCode = 1
            return
          }
          await wait(Math.max(pollMs, 5_000))
        }
      }
    } finally {
      process.removeListener('SIGINT', stop)
      process.removeListener('SIGTERM', stop)
      this.logger.info('Notification outbox worker stopped')
    }
  }
}
