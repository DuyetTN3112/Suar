import { randomUUID } from 'node:crypto'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import { writeDomainEventOutboxRetentionFailureAuditPreservingPrimary } from '#composition/command_support/domain-event-outbox-administration/domain_event_outbox_retention_audit'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import {
  DOMAIN_EVENT_OUTBOX_RETENTION_SERVICE_PRINCIPAL_ENV_KEY,
  resolveDomainEventOutboxRetentionServicePrincipal,
} from '#modules/authorization/public_contracts/domain_event_outbox_retention_service_principal'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import { PurgeDomainEventOutboxRetentionCommand } from '#modules/events/actions/commands/domain-event-outbox-administration/purge_domain_event_outbox_retention_command'
import type { DomainEventOutboxRetentionPurgeResult } from '#modules/events/actions/dtos/domain-event-outbox-administration/domain_event_outbox_retention'
import { PreviewDomainEventOutboxRetentionQuery } from '#modules/events/actions/queries/domain-event-outbox-administration/preview_domain_event_outbox_retention_query'
import { DOMAIN_EVENT_OUTBOX_RETENTION_BATCH_LIMIT } from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox_retention_policy'
import { PostgresDomainEventOutboxRetentionRepository } from '#modules/events/infra/repositories/domain-event-outbox-administration/postgres_domain_event_outbox_retention_repository'
import env from '#start/env'

function safeFailureDiagnostic(error: unknown): string {
  const serialized = serializeObservabilityError(error)
  const errorClass =
    serialized && typeof serialized['class'] === 'string' ? serialized['class'] : 'UnknownError'
  return `class=${errorClass}`
}

export default class DomainEventOutboxRetentionCommand extends BaseCommand {
  static override commandName = 'domain-events:outbox-retention'
  static override description =
    'Preview or apply bounded processed domain-event and replay-history retention'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Apply retention; omission performs an audited preview' })
  declare apply: boolean

  @flags.number({ description: 'Processed outbox retention window in days (1-3650)' })
  declare processedRetentionDays?: number

  @flags.number({ description: 'Replay-history retention window in days (1-3650)' })
  declare replayHistoryRetentionDays?: number

  @flags.number({
    description: `Maximum rows purged per category (1-${DOMAIN_EVENT_OUTBOX_RETENTION_BATCH_LIMIT})`,
  })
  declare batchSize?: number

  @flags.string({ description: 'Required purge reason (10-500 characters)' })
  declare reason?: string

  @flags.string({ description: 'Required exact purge confirmation: PURGE' })
  declare confirmation?: string

  override async run(): Promise<void> {
    try {
      await this.runAuthorized()
    } catch (error) {
      this.logger.error(`Domain event outbox retention failed ${safeFailureDiagnostic(error)}`)
      this.exitCode = 1
    }
  }

  private async runAuthorized(): Promise<void> {
    const operatorIdentity = await resolveDomainEventOutboxRetentionServicePrincipal(
      env.get(DOMAIN_EVENT_OUTBOX_RETENTION_SERVICE_PRINCIPAL_ENV_KEY),
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
    const processedRetentionDays =
      this.processedRetentionDays ?? env.get('DOMAIN_EVENT_OUTBOX_PROCESSED_RETENTION_DAYS', 30)
    const replayHistoryRetentionDays =
      this.replayHistoryRetentionDays ??
      env.get('DOMAIN_EVENT_OUTBOX_REPLAY_HISTORY_RETENTION_DAYS', 365)
    const batchSize = this.batchSize ?? env.get('DOMAIN_EVENT_OUTBOX_RETENTION_BATCH_SIZE', 500)
    const runId = randomUUID()
    const execution = {
      userId: operatorIdentity.actorId,
      operatorIdentity,
    }
    const auditContext = {
      userId: operatorIdentity.actorId,
      ip: '0.0.0.0',
      userAgent: 'service-principal:domain-event-outbox-retention-cli',
      organizationId: null,
      actorRoleSurface: operatorIdentity.actorRoleSurface,
      requestId: null,
      traceId: null,
      workflowId: runId,
    }
    const repository = new PostgresDomainEventOutboxRetentionRepository()
    const previewQuery = new PreviewDomainEventOutboxRetentionQuery(repository)
    const purgeCommand = new PurgeDomainEventOutboxRetentionCommand(repository)

    if (!this.apply) {
      const preview = await previewQuery.execute({
        processedRetentionDays,
        replayHistoryRetentionDays,
        execution,
      })
      await auditPublicApi.write(auditContext, {
        action: 'domain_event_outbox_retention.previewed',
        event_name: 'domain_event.outbox_retention.previewed',
        event_family: 'domain_event_operations',
        module: 'events',
        subsystem: 'domain_event_outbox',
        workflow: 'domain_event_outbox_retention',
        stage: 'preview',
        severity: 'info',
        outcome: 'success',
        actor_type: operatorIdentity.actorType,
        entity_type: 'domain_event_outbox_retention_run',
        entity_id: runId,
        target_type: 'domain_event_outbox',
        target_id: 'processed_and_replay_history',
        retention_class: 'security',
        critical: true,
        new_values: {
          processedRetentionDays,
          replayHistoryRetentionDays,
          processedBefore: preview.processedBefore.toISOString(),
          replayHistoryBefore: preview.replayHistoryBefore.toISOString(),
          dueProcessedRows: preview.dueProcessedRows,
          dueReplayHistoryRows: preview.dueReplayHistoryRows,
          processedCountCapped: preview.processedCountCapped,
          replayHistoryCountCapped: preview.replayHistoryCountCapped,
          authenticationProvenance: operatorIdentity.authenticationProvenance,
          configurationKey: operatorIdentity.configurationKey,
        },
      })
      this.logger.info(
        JSON.stringify({
          mode: 'preview',
          processedRetentionDays,
          replayHistoryRetentionDays,
          processedBefore: preview.processedBefore.toISOString(),
          replayHistoryBefore: preview.replayHistoryBefore.toISOString(),
          dueProcessedRows: preview.dueProcessedRows,
          dueReplayHistoryRows: preview.dueReplayHistoryRows,
          processedCountCapped: preview.processedCountCapped,
          replayHistoryCountCapped: preview.replayHistoryCountCapped,
        })
      )
      return
    }

    const reason = this.reason?.trim() ?? ''
    let result: DomainEventOutboxRetentionPurgeResult | undefined
    try {
      await db.transaction(async (trx) => {
        await auditPublicApi.write(
          auditContext,
          {
            action: 'domain_event_outbox_retention.started',
            event_name: 'domain_event.outbox_retention.started',
            event_family: 'domain_event_operations',
            module: 'events',
            subsystem: 'domain_event_outbox',
            workflow: 'domain_event_outbox_retention',
            stage: 'started',
            severity: 'warning',
            outcome: 'pending',
            actor_type: operatorIdentity.actorType,
            entity_type: 'domain_event_outbox_retention_run',
            entity_id: runId,
            target_type: 'domain_event_outbox',
            target_id: 'processed_and_replay_history',
            retention_class: 'security',
            critical: true,
            new_values: {
              reason,
              processedRetentionDays,
              replayHistoryRetentionDays,
              batchSize,
              authenticationProvenance: operatorIdentity.authenticationProvenance,
              configurationKey: operatorIdentity.configurationKey,
            },
          },
          trx
        )
        result = await purgeCommand.execute(
          {
            processedRetentionDays,
            replayHistoryRetentionDays,
            batchSize,
            reason,
            confirmation: this.confirmation ?? '',
            execution,
          },
          trx
        )
        await auditPublicApi.write(
          auditContext,
          {
            action: 'domain_event_outbox_retention.completed',
            event_name: 'domain_event.outbox_retention.completed',
            event_family: 'domain_event_operations',
            module: 'events',
            subsystem: 'domain_event_outbox',
            workflow: 'domain_event_outbox_retention',
            stage: 'completed',
            severity: 'info',
            outcome: 'success',
            actor_type: operatorIdentity.actorType,
            entity_type: 'domain_event_outbox_retention_run',
            entity_id: runId,
            target_type: 'domain_event_outbox',
            target_id: 'processed_and_replay_history',
            retention_class: 'security',
            critical: true,
            new_values: {
              reason,
              processedRetentionDays,
              replayHistoryRetentionDays,
              batchSize,
              processedBefore: result.processedBefore.toISOString(),
              replayHistoryBefore: result.replayHistoryBefore.toISOString(),
              purgedProcessedRows: result.purgedProcessedRows,
              purgedReplayHistoryRows: result.purgedReplayHistoryRows,
              authenticationProvenance: operatorIdentity.authenticationProvenance,
              configurationKey: operatorIdentity.configurationKey,
            },
          },
          trx
        )
      })
    } catch (error) {
      await writeDomainEventOutboxRetentionFailureAuditPreservingPrimary(
        error,
        () =>
          auditPublicApi.write(auditContext, {
            action: 'domain_event_outbox_retention.failed',
            event_name: 'domain_event.outbox_retention.failed',
            event_family: 'domain_event_operations',
            module: 'events',
            subsystem: 'domain_event_outbox',
            workflow: 'domain_event_outbox_retention',
            stage: 'failed',
            severity: 'error',
            outcome: 'failure',
            actor_type: operatorIdentity.actorType,
            entity_type: 'domain_event_outbox_retention_run',
            entity_id: runId,
            target_type: 'domain_event_outbox',
            target_id: 'processed_and_replay_history',
            retention_class: 'security',
            critical: true,
            new_values: {
              reason,
              processedRetentionDays,
              replayHistoryRetentionDays,
              batchSize,
              errorClass: error instanceof Error ? error.constructor.name : 'UnknownError',
              authenticationProvenance: operatorIdentity.authenticationProvenance,
              configurationKey: operatorIdentity.configurationKey,
            },
          }),
        (auditError) => {
          this.logger.error(
            `Domain event outbox retention failure audit unavailable primary_${safeFailureDiagnostic(
              error
            )} audit_${safeFailureDiagnostic(auditError)}`
          )
        }
      )
    }

    if (!result) {
      throw new InvariantViolationException(
        'Domain event outbox retention transaction completed without a result'
      )
    }
    this.logger.success(
      `Domain event outbox retention purged_processed=${String(
        result.purgedProcessedRows
      )} purged_replay_history=${String(result.purgedReplayHistoryRows)}`
    )
  }
}
