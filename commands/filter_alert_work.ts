import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { filterAlertDelivery, filterAlertEvaluator, filterAlertRepository } from '#composition/filtering/filter-runtime/filtering_composition'
import { sanitizeErrorLogText } from '#modules/errors/public_contracts/error_sanitization'
import { FilterAlertWorker } from '#modules/filtering/infra/adapters/filter-alert/filter_alert_worker'

function wait(milliseconds: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds)
    timer.unref()
    const finish = () => {
      clearTimeout(timer)
      resolve()
    }
    signal.addEventListener('abort', finish, { once: true })
  })
}

export default class FilterAlertWorkCommand extends BaseCommand {
  static override commandName = 'filter:alert-work'
  static override description = 'Evaluate due saved-view alerts and stage durable notifications'

  static override options: CommandOptions = { startApp: true }

  @flags.boolean({ description: 'Run one bounded alert evaluation and exit' })
  declare once: boolean

  @flags.number({ description: 'Polling interval in milliseconds' })
  declare pollMs?: number

  @flags.number({ description: 'Alert lease duration in milliseconds' })
  declare leaseDurationMs?: number

  override async run(): Promise<void> {
    const pollMs = this.pollMs ?? 30_000
    const leaseDurationMs = this.leaseDurationMs ?? 30_000
    if (!Number.isSafeInteger(pollMs) || pollMs < 100 || pollMs > 60_000) {
      this.logger.error('pollMs must be an integer between 100 and 60000')
      this.exitCode = 1
      return
    }
    if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs < 1_000 || leaseDurationMs > 300_000) {
      this.logger.error('leaseDurationMs must be an integer between 1000 and 300000')
      this.exitCode = 1
      return
    }

    const workerId = `${hostname()}:${process.pid}:${randomUUID()}`
    const worker = new FilterAlertWorker(filterAlertRepository, filterAlertEvaluator, filterAlertDelivery)
    const shutdown = new AbortController()
    const stop = () => shutdown.abort()
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    this.logger.info(`Filter alert worker started worker=${workerId}`)

    try {
      while (!shutdown.signal.aborted) {
        try {
          const result = await worker.runOnce({
            workerId,
            now: new Date().toISOString(),
            leaseDurationMs,
            fenceToken: randomUUID(),
          })
          if (result.claimed) {
            this.logger.info(`Filter alert run delivered=${String(result.delivered)} watermark_advanced=${String(result.watermarkAdvanced)} paused=${String(result.paused)} lease_lost=${String(result.leaseLost)}`)
          }
          if (this.once) {
            if (result.leaseLost) this.exitCode = 1
            return
          }
          await wait(result.claimed ? 0 : pollMs, shutdown.signal)
        } catch (error) {
          this.logger.error(`Filter alert worker iteration failed: ${sanitizeErrorLogText(error instanceof Error ? error.message : error)}`)
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
      this.logger.info('Filter alert worker stopped')
    }
  }
}
