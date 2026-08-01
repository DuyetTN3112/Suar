import { randomUUID } from 'node:crypto'

import { BaseCommand, flags } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

import { writeNotificationRetentionFailureAuditPreservingPrimary } from '#composition/command_support/notification_retention_audit'
import {
  makePreviewNotificationRetentionQuery,
  makePurgeNotificationRetentionCommand,
} from '#composition/notification_projection_composition'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import {
  NOTIFICATION_RETENTION_SERVICE_PRINCIPAL_ENV_KEY,
  resolveNotificationRetentionServicePrincipal,
} from '#modules/authorization/public_contracts/notification_retention_service_principal'
import { hasSystemPermission } from '#modules/authorization/public_contracts/permissions'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import env from '#start/env'

function safeFailureDiagnostic(error: unknown): string {
  const serialized = serializeObservabilityError(error)
  const errorClass =
    serialized && typeof serialized['class'] === 'string' ? serialized['class'] : 'UnknownError'
  return `class=${errorClass}`
}

export default class NotificationRetentionCommand extends BaseCommand {
  static override commandName = 'notification:retention'
  static override description =
    'Preview or apply bounded notification content and processed-work retention'

  static override options: CommandOptions = {
    startApp: true,
  }

  @flags.boolean({ description: 'Apply retention; without this flag the command is read-only' })
  declare apply: boolean

  @flags.number({ description: 'Maximum rows per retention category (hard maximum 1000)' })
  declare batchSize?: number

  @flags.string({ description: 'Required retention reason when --apply is used' })
  declare reason?: string

  @flags.string({ description: 'Required exact retention confirmation: PURGE' })
  declare confirmation?: string

  override async run(): Promise<void> {
    const operatorIdentity = await resolveNotificationRetentionServicePrincipal(
      env.get(NOTIFICATION_RETENTION_SERVICE_PRINCIPAL_ENV_KEY),
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
    const batchSize = this.batchSize ?? env.get('NOTIFICATION_RETENTION_BATCH_SIZE', 100)
    const runId = randomUUID()
    const execCtx = {
      userId: operatorIdentity.actorId,
      ip: '0.0.0.0',
      userAgent: 'service-principal:notification-retention-cli',
      organizationId: null,
      actorRoleSurface: operatorIdentity.actorRoleSurface,
      requestId: null,
      traceId: null,
      workflowId: runId,
      operatorIdentity,
    }
    if (!this.apply) {
      const preview = await makePreviewNotificationRetentionQuery().execute()
      await auditPublicApi.write(execCtx, {
        action: 'notification_retention.previewed',
        event_name: 'notification.retention.previewed',
        event_family: 'notification_operations',
        module: 'notifications',
        subsystem: 'retention',
        workflow: 'notification_retention',
        stage: 'preview',
        severity: 'info',
        outcome: 'success',
        actor_type: operatorIdentity.actorType,
        entity_type: 'notification_retention_run',
        entity_id: runId,
        target_type: 'notification_center',
        target_id: 'canonical',
        retention_class: 'security',
        critical: true,
        new_values: {
          ...preview,
          authenticationProvenance: operatorIdentity.authenticationProvenance,
          configurationKey: operatorIdentity.configurationKey,
        },
      })
      this.logger.info(
        JSON.stringify({
          component: 'notification_retention',
          mode: 'preview',
          ...preview,
        })
      )
      return
    }

    const reason = this.reason?.trim()
    if (!reason || reason.length < 10 || reason.length > 500 || this.confirmation !== 'PURGE') {
      this.logger.error('--apply requires a --reason of 10-500 characters and --confirmation=PURGE')
      this.exitCode = 1
      return
    }

    await auditPublicApi.write(execCtx, {
      action: 'notification_retention.started',
      event_name: 'notification.retention.started',
      event_family: 'notification_operations',
      module: 'notifications',
      subsystem: 'retention',
      workflow: 'notification_retention',
      stage: 'started',
      severity: 'info',
      outcome: 'pending',
      actor_type: operatorIdentity.actorType,
      entity_type: 'notification_retention_run',
      entity_id: runId,
      target_type: 'notification_center',
      target_id: 'canonical',
      retention_class: 'security',
      critical: true,
      new_values: {
        reason,
        batchSize,
        authenticationProvenance: operatorIdentity.authenticationProvenance,
        configurationKey: operatorIdentity.configurationKey,
      },
    })

    try {
      const result = await makePurgeNotificationRetentionCommand().execute({
        batchSize,
        reason,
        confirmation: this.confirmation,
        execution: {
          userId: operatorIdentity.actorId,
          operatorIdentity,
        },
      })
      await auditPublicApi.write(execCtx, {
        action: 'notification_retention.completed',
        event_name: 'notification.retention.completed',
        event_family: 'notification_operations',
        module: 'notifications',
        subsystem: 'retention',
        workflow: 'notification_retention',
        stage: 'completed',
        severity: 'info',
        outcome: 'success',
        actor_type: operatorIdentity.actorType,
        entity_type: 'notification_retention_run',
        entity_id: runId,
        target_type: 'notification_center',
        target_id: 'canonical',
        retention_class: 'security',
        critical: true,
        new_values: { reason, batchSize, ...result },
      })
      this.logger.success(JSON.stringify({ runId, ...result }))
    } catch (error) {
      await writeNotificationRetentionFailureAuditPreservingPrimary(
        error,
        () =>
          auditPublicApi.write(execCtx, {
            action: 'notification_retention.failed',
            event_name: 'notification.retention.failed',
            event_family: 'notification_operations',
            module: 'notifications',
            subsystem: 'retention',
            workflow: 'notification_retention',
            stage: 'failed',
            severity: 'error',
            outcome: 'failure',
            actor_type: operatorIdentity.actorType,
            entity_type: 'notification_retention_run',
            entity_id: runId,
            target_type: 'notification_center',
            target_id: 'canonical',
            retention_class: 'security',
            critical: true,
            new_values: {
              reason,
              batchSize,
              errorClass: error instanceof Error ? error.constructor.name : 'UnknownError',
              authenticationProvenance: operatorIdentity.authenticationProvenance,
              configurationKey: operatorIdentity.configurationKey,
            },
          }),
        (auditError) => {
          this.logger.error(
            `Notification retention failure audit unavailable primary_${safeFailureDiagnostic(
              error
            )} audit_${safeFailureDiagnostic(auditError)}`
          )
        }
      )
    }
  }
}
