import { randomUUID } from 'node:crypto'
import { hostname } from 'node:os'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import {
  bindDomainEventOutboxShutdownSignals,
  waitForDomainEventOutboxPoll,
} from '#composition/command_support/domain_event_outbox_runtime'
import domainEventOutboxConfig from '#config/domain_event_outbox'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import { AdonisDomainEventDispatcher } from '#modules/events/infra/adapters/domain-event-outbox-administration/adonis_domain_event_dispatcher'
import { DomainEventOutboxWorker } from '#modules/events/infra/adapters/domain-event-outbox-administration/domain_event_outbox_worker'

function safeFailureDiagnostic(error: unknown): string {
  const serialized = serializeObservabilityError(error)
  const errorClass =
    serialized && typeof serialized['class'] === 'string' ? serialized['class'] : 'UnknownError'
  const rawCode =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : 'UNCLASSIFIED'
  const errorCode = rawCode.replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 128) || 'UNCLASSIFIED'
  return `class=${errorClass} code=${errorCode}`
}

function isAbortRequested(signal: AbortSignal): boolean {
  return signal.aborted
}

export default class DomainEventOutboxWorkCommand extends BaseCommand {
  static override commandName = 'domain-events:outbox-work'
  static override description = 'Drain the durable domain-event outbox into in-process listeners'

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

  @flags.number({ description: 'Lease duration in milliseconds (1000-300000)' })
  declare leaseMs?: number

  @flags.number({ description: 'Lease heartbeat interval in milliseconds' })
  declare heartbeatMs?: number

  @flags.number({ description: 'Per-handler deadline in milliseconds' })
  declare handlerDeadlineMs?: number

  override async run(): Promise<void> {
    const pollMs = this.pollMs ?? domainEventOutboxConfig.pollMs
    if (!Number.isSafeInteger(pollMs) || pollMs < 100 || pollMs > 60_000) {
      this.logger.error('pollMs must be an integer between 100 and 60000')
      this.exitCode = 1
      return
    }

    const workerId = `${hostname()}:${process.pid}:${randomUUID()}`
    const worker = new DomainEventOutboxWorker({
      workerId,
      dispatcher: new AdonisDomainEventDispatcher(),
      batchSize: this.batchSize ?? domainEventOutboxConfig.batchSize,
      concurrency: this.concurrency ?? domainEventOutboxConfig.concurrency,
      leaseDurationMs: this.leaseMs ?? domainEventOutboxConfig.leaseDurationMs,
      heartbeatIntervalMs:
        this.heartbeatMs ?? domainEventOutboxConfig.heartbeatIntervalMs,
      handlerDeadlineMs:
        this.handlerDeadlineMs ?? domainEventOutboxConfig.handlerDeadlineMs,
      maxAttempts: domainEventOutboxConfig.maxAttempts,
      retryBaseMs: domainEventOutboxConfig.retryBaseMs,
      retryCapMs: domainEventOutboxConfig.retryCapMs,
    })
    const shutdownController = new AbortController()
    const removeShutdownListeners =
      bindDomainEventOutboxShutdownSignals(shutdownController)
    this.logger.info('Domain event outbox worker started')

    try {
      while (!isAbortRequested(shutdownController.signal)) {
        try {
          const result = await worker.runOnce({ signal: shutdownController.signal })
          if (result.claimed > 0) {
            this.logger.info(
              `Domain event outbox batch claimed=${String(
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
              'Domain event outbox requires operator attention: dead-letter or lease loss detected'
            )
          }
          if (this.once) {
            if (result.deadLettered > 0 || result.leaseLost > 0) {
              this.exitCode = 1
            }
            return
          }
          if (result.claimed === 0) {
            await waitForDomainEventOutboxPoll(pollMs, shutdownController.signal)
          }
        } catch (error) {
          if (isAbortRequested(shutdownController.signal)) {
            break
          }
          this.logger.error(
            `Domain event outbox worker iteration failed ${safeFailureDiagnostic(error)}`
          )
          if (this.once) {
            this.exitCode = 1
            return
          }
          await waitForDomainEventOutboxPoll(
            Math.max(pollMs, 5_000),
            shutdownController.signal
          )
        }
      }
    } finally {
      removeShutdownListeners()
      this.logger.info('Domain event outbox worker stopped')
    }
  }
}
