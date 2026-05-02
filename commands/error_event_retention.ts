import { randomUUID } from 'node:crypto'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import {
  ERROR_EVENT_RETENTION_SERVICE_PRINCIPAL_ENV_KEY,
  resolveErrorEventServicePrincipal,
} from '#modules/authorization/public_contracts/error_event_service_principal'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'
import { ERROR_EVENT_RETENTION_BATCH_LIMIT } from '#modules/errors/domain/error_event_retention_policy'
import { PurgeErrorEventRetentionCommand } from '#modules/errors/actions/commands/purge_error_event_retention_command'
import { PreviewErrorEventRetentionQuery } from '#modules/errors/actions/queries/preview_error_event_retention_query'
import { PostgresErrorEventRetentionRepository } from '#modules/errors/infra/repositories/postgres_error_event_retention_repository'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import env from '#start/env'

function safeFailureDiagnostic(error: unknown): string {
  const serialized = serializeObservabilityError(error)
  const errorClass =
    serialized && typeof serialized['class'] === 'string' ? serialized['class'] : 'UnknownError'
  return `class=${errorClass}`
}

export default class ErrorEventRetentionCommand extends BaseCommand {
  static override commandName = 'error-events:retention'
  static override description =
    'Preview or apply authorized, audited, and bounded error-event retention'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Apply a purge; omission performs an audited count preview' })
  declare apply: boolean

  @flags.number({ description: 'Retention window in days (1-365)' })
  declare retentionDays?: number

  @flags.number({
    description: `Maximum rows purged per run (1-${ERROR_EVENT_RETENTION_BATCH_LIMIT})`,
  })
  declare batchSize?: number

  @flags.string({ description: 'Required purge reason (10-500 characters)' })
  declare reason?: string

  @flags.string({ description: 'Required exact purge confirmation: PURGE' })
  declare confirmation?: string

  override async run(): Promise<void> {
    try {
      const operatorIdentity = await resolveErrorEventServicePrincipal(
        env.get(ERROR_EVENT_RETENTION_SERVICE_PRINCIPAL_ENV_KEY),
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
      const retentionDays = this.retentionDays ?? env.get('ERROR_EVENT_RETENTION_DAYS', 30)
      const batchSize = this.batchSize ?? env.get('ERROR_EVENT_RETENTION_BATCH_SIZE', 100)
      const runId = randomUUID()
      const execution = {
        userId: operatorIdentity.actorId,
        operatorIdentity,
      }
      const auditContext = {
        userId: operatorIdentity.actorId,
        ip: '0.0.0.0',
        userAgent: 'service-principal:error-event-retention-cli',
        organizationId: null,
        actorRoleSurface: operatorIdentity.actorRoleSurface,
        requestId: null,
        traceId: null,
        workflowId: runId,
      }
      const repository = new PostgresErrorEventRetentionRepository()
      const previewQuery = new PreviewErrorEventRetentionQuery(repository)
      const purgeCommand = new PurgeErrorEventRetentionCommand(repository)

      if (!this.apply) {
        const preview = await previewQuery.execute({ retentionDays, execution })
        await auditPublicApi.write(auditContext, {
          action: 'error_event_retention.previewed',
          event_name: 'error_event.retention.previewed',
          event_family: 'error_operations',
          module: 'errors',
          subsystem: 'retention',
          workflow: 'error_event_retention',
          stage: 'preview',
          severity: 'info',
          outcome: 'success',
          actor_type: operatorIdentity.actorType,
          entity_type: 'error_event_retention_run',
          entity_id: runId,
          target_type: 'error_event_store',
          target_id: 'canonical',
          retention_class: 'security',
          critical: true,
          new_values: {
            retentionDays,
            cutoff: preview.cutoff.toISOString(),
            dueCount: preview.dueCount,
            countCapped: preview.countCapped,
            authenticationProvenance: operatorIdentity.authenticationProvenance,
            configurationKey: operatorIdentity.configurationKey,
          },
        })
        this.logger.info(
          JSON.stringify({
            mode: 'preview',
            retentionDays,
            cutoff: preview.cutoff.toISOString(),
            dueCount: preview.dueCount,
            countCapped: preview.countCapped,
          })
        )
        return
      }

      const reason = this.reason?.trim() ?? ''
      let result: { cutoff: Date; purgedCount: number } | undefined
      await db.transaction(async (trx) => {
        await auditPublicApi.write(
          auditContext,
          {
            action: 'error_event_retention.started',
            event_name: 'error_event.retention.started',
            event_family: 'error_operations',
            module: 'errors',
            subsystem: 'retention',
            workflow: 'error_event_retention',
            stage: 'started',
            severity: 'warning',
            outcome: 'pending',
            actor_type: operatorIdentity.actorType,
            entity_type: 'error_event_retention_run',
            entity_id: runId,
            target_type: 'error_event_store',
            target_id: 'canonical',
            retention_class: 'security',
            critical: true,
            new_values: {
              reason,
              retentionDays,
              batchSize,
              authenticationProvenance: operatorIdentity.authenticationProvenance,
              configurationKey: operatorIdentity.configurationKey,
            },
          },
          trx
        )
        result = await purgeCommand.execute(
          {
            retentionDays,
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
            action: 'error_event_retention.completed',
            event_name: 'error_event.retention.completed',
            event_family: 'error_operations',
            module: 'errors',
            subsystem: 'retention',
            workflow: 'error_event_retention',
            stage: 'completed',
            severity: 'info',
            outcome: 'success',
            actor_type: operatorIdentity.actorType,
            entity_type: 'error_event_retention_run',
            entity_id: runId,
            target_type: 'error_event_store',
            target_id: 'canonical',
            retention_class: 'security',
            critical: true,
            new_values: {
              reason,
              retentionDays,
              batchSize,
              cutoff: result.cutoff.toISOString(),
              purgedCount: result.purgedCount,
            },
          },
          trx
        )
      })

      if (!result) {
        throw new InvariantViolationException(
          'Error-event retention transaction completed without a result'
        )
      }
      this.logger.success(
        `Error-event retention purged=${String(result.purgedCount)} cutoff=${result.cutoff.toISOString()}`
      )
    } catch (error) {
      this.logger.error(`Error-event retention failed ${safeFailureDiagnostic(error)}`)
      this.exitCode = 1
    }
  }
}
