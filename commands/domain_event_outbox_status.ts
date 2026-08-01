import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import { readDomainEventOutboxStatus } from '#modules/events/public_contracts/domain_event_outbox_status'

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

export default class DomainEventOutboxStatusCommand extends BaseCommand {
  static override commandName = 'domain-events:outbox-status'
  static override description =
    'Show actionable domain-event backlog, backoff, lease, and dead-letter health'

  static override options: CommandOptions = {
    startApp: true,
  }

  override async run(): Promise<void> {
    try {
      const status = await readDomainEventOutboxStatus()
      this.logger.info(
        JSON.stringify({
          component: 'domain_event_outbox',
          ...status,
        })
      )
      if (
        status.deadLetter > 0 ||
        status.deadLetterCountCapped ||
        status.expiredLeases > 0 ||
        status.expiredLeaseCountCapped
      ) {
        this.logger.error(
          'Domain event outbox has dead letters or expired leases requiring operator attention'
        )
        this.exitCode = 2
      }
    } catch (error) {
      this.logger.error(
        `Domain event outbox status failed ${safeFailureDiagnostic(error)}`
      )
      this.exitCode = 1
    }
  }
}
