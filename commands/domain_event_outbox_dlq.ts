import { createHash } from 'node:crypto'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import { LucidDomainEventOutboxAdministrationTransactionExecutor } from '#composition/adapters/lucid_domain_event_outbox_administration_transaction_executor'
import { NodeDomainEventOutboxAdministrationEvidenceGenerator } from '#composition/adapters/node_domain_event_outbox_administration_evidence_generator'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'
import {
  DOMAIN_EVENT_DLQ_SERVICE_PRINCIPAL_ENV_KEY,
  resolveDomainEventDlqServicePrincipal,
} from '#modules/authorization/public_contracts/trusted_service_principal'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import { ReplayDomainEventDeadLettersCommand } from '#modules/events/actions/commands/replay_domain_event_dead_letters_command'
import { PreviewDomainEventDeadLettersQuery } from '#modules/events/actions/queries/preview_domain_event_dead_letters_query'
import type { DurableDomainEventName } from '#modules/events/domain/domain_event_outbox'
import {
  DOMAIN_EVENT_OUTBOX_ADMIN_BATCH_LIMIT,
  type DomainEventOutboxAdminSelector,
  type DomainEventOutboxDeadLetterPreviewItem,
} from '#modules/events/domain/domain_event_outbox_administration'
import { PostgresDomainEventOutboxAdministrationRepository } from '#modules/events/infra/postgres_domain_event_outbox_administration_repository'
import env from '#start/env'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function parseEventName(value: string | undefined): DurableDomainEventName | undefined {
  if (value === undefined) return undefined
  if (
    value !== 'task:assignment:completed' &&
    value !== 'review:submitted' &&
    value !== 'review:confirmed' &&
    value !== 'dispute:resolved' &&
    value !== 'reviews:talent-explainability-projection:changed:v1' &&
    value !== 'search:talent-reindex-requested'
  ) {
    throw new RangeError(
      'eventName must be task:assignment:completed, review:submitted, review:confirmed, dispute:resolved, reviews:talent-explainability-projection:changed:v1, or search:talent-reindex-requested'
    )
  }
  return value
}

function positiveSequence(value: number | undefined): number | undefined {
  if (value === undefined) return undefined
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError('afterSequence must be a positive integer')
  }
  return value
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function serializeItem(item: DomainEventOutboxDeadLetterPreviewItem) {
  return {
    id: item.id,
    sequence: item.sequence,
    eventName: item.eventName,
    dedupeKeyDigest: digest(item.dedupeKey),
    aggregateType: item.aggregateType,
    aggregateId: item.aggregateId,
    attemptCount: item.attemptCount,
    lifetimeAttemptCount: item.lifetimeAttemptCount,
    replayCount: item.replayCount,
    errorCode: item.errorCode,
    deadLetteredAt: item.deadLetteredAt.toISOString(),
  }
}

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

export default class DomainEventOutboxDlqCommand extends BaseCommand {
  static override commandName = 'domain-events:outbox-dlq'
  static override description =
    'Preview bounded domain-event DLQ metadata or explicitly replay dead-letter rows'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.string({ description: 'Exact outbox row UUID filter' })
  declare id?: string

  @flags.string({ description: 'Exact supported domain event name filter' })
  declare eventName?: string

  @flags.string({ description: 'Exact event dedupe key filter' })
  declare dedupeKey?: string

  @flags.number({ description: 'Continue preview after this outbox sequence' })
  declare afterSequence?: number

  @flags.number({
    description: `Preview page size (1-${DOMAIN_EVENT_OUTBOX_ADMIN_BATCH_LIMIT})`,
    default: 50,
  })
  declare limit: number

  @flags.boolean({ description: 'Apply a replay; omission performs an audited preview' })
  declare apply: boolean

  @flags.string({ description: 'Required replay reason (10-500 characters)' })
  declare reason?: string

  @flags.string({ description: 'Required exact replay confirmation: REPLAY' })
  declare confirmation?: string

  @flags.boolean({ description: 'Emit machine-readable JSON' })
  declare json: boolean

  override async run(): Promise<void> {
    try {
      const operatorIdentity = await resolveDomainEventDlqServicePrincipal(
        env.get(DOMAIN_EVENT_DLQ_SERVICE_PRINCIPAL_ENV_KEY),
        {
          async findPrincipal(actorId) {
            const actor = (await db
              .from('users')
              .select('id', 'system_role', 'status')
              .where('id', actorId)
              .first()) as { id: string; system_role: string; status: string } | undefined

            return actor
              ? {
                  id: actor.id,
                  systemRole: actor.system_role,
                  status: actor.status,
                }
              : null
          },
          hasPermission: hasSystemPermission,
        }
      )
      if (this.id !== undefined && !UUID_PATTERN.test(this.id)) {
        throw new RangeError('id must be a UUID')
      }
      const eventName = parseEventName(this.eventName)
      const selector: DomainEventOutboxAdminSelector = {
        ...(this.id === undefined ? {} : { id: this.id }),
        ...(eventName === undefined ? {} : { eventName }),
        ...(this.dedupeKey === undefined ? {} : { dedupeKey: this.dedupeKey }),
      }
      const execCtx = {
        userId: operatorIdentity.actorId,
        ip: '0.0.0.0',
        userAgent: 'service-principal:domain-event-outbox-dlq-cli',
        organizationId: null,
        actorRoleSurface: operatorIdentity.actorRoleSurface,
        requestId: null,
        traceId: null,
        workflowId: 'domain_event_outbox_dlq_administration',
        operatorIdentity,
      }
      const repository = new PostgresDomainEventOutboxAdministrationRepository()
      const evidenceGenerator = new NodeDomainEventOutboxAdministrationEvidenceGenerator()
      const previewQuery = new PreviewDomainEventDeadLettersQuery(repository, {
        auditWriter: auditPublicApi,
        evidenceGenerator,
      })
      const replayCommand = new ReplayDomainEventDeadLettersCommand(repository, {
        auditWriter: auditPublicApi,
        transactionExecutor: new LucidDomainEventOutboxAdministrationTransactionExecutor(),
        evidenceGenerator,
      })

      if (this.apply) {
        if (!this.reason || this.confirmation !== 'REPLAY' || this.afterSequence !== undefined) {
          throw new RangeError(
            'Replay requires --reason and --confirmation=REPLAY; afterSequence is preview-only'
          )
        }
        const result = await replayCommand.execute(
          {
            selector,
            reason: this.reason,
            confirmation: this.confirmation,
          },
          execCtx
        )
        if (result.hasMoreOrLocked) {
          this.logger.warning(
            `Domain event outbox replay deferred matched=${String(
              result.matchedCount
            )} deferred=${String(result.deferredCount)}; no partial mutation was applied`
          )
          this.exitCode = 2
          return
        }
        this.logger.success(
          `Domain event outbox replay completed matched=${String(
            result.matchedCount
          )} affected=${String(result.affectedCount)} selection_digest=${result.selectionDigest}`
        )
        return
      }

      const afterSequence = positiveSequence(this.afterSequence)
      const page = await previewQuery.execute(
        {
          selector,
          limit: this.limit,
          ...(afterSequence === undefined ? {} : { afterSequence }),
        },
        execCtx
      )
      const output = {
        items: page.items.map(serializeItem),
        returnedCount: page.items.length,
        hasMore: page.hasMore,
        nextAfterSequence: page.nextAfterSequence,
      }
      if (this.json) {
        this.logger.info(JSON.stringify(output))
        return
      }
      for (const item of output.items) {
        this.logger.info(
          `id=${item.id} sequence=${String(item.sequence)} event=${item.eventName} ` +
            `dedupe_digest=${item.dedupeKeyDigest} attempts=${String(
              item.attemptCount
            )} lifetime_attempts=${String(item.lifetimeAttemptCount)} replays=${String(
              item.replayCount
            )} error_code=${item.errorCode} dead_lettered_at=${item.deadLetteredAt}`
        )
      }
      this.logger.info(
        `returned=${String(output.returnedCount)} has_more=${String(
          output.hasMore
        )} next_after_sequence=${String(output.nextAfterSequence ?? '')}`
      )
    } catch (error) {
      this.logger.error(`Domain event outbox administration failed ${safeFailureDiagnostic(error)}`)
      this.exitCode = 1
    }
  }
}
