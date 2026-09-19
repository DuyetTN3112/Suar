import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'

import { computeAuditEventHash } from '#modules/audit/public_contracts/audit_event_hash'
import { wrapApiV1Data } from '#modules/http/boundary/api_v1_response'
import { buildTestingAuditSeedRequest } from '#modules/testing/controllers/mappers/request/testing-auth/testing_route_request_mapper'
import { testingDatabaseCleaner } from '#modules/testing/infra/testing_database_cleaner'
import {
  findOrCreateTestingAuditUserByEmail,
  getPreviousTestingAuditHash,
  uniqueTestingAuditScopes,
} from '#modules/testing/infra/testing_seed_support'

export default class TestingAuditSeedController {
  async seedAuditLog({ request, response }: HttpContext): Promise<void> {
    const input = request.all()
    const auditInput = buildTestingAuditSeedRequest(input, {
      timestamp: Date.now(),
      nonce: crypto.randomUUID().slice(0, 8),
    })
    const {
      timestamp,
      seedKey,
      action,
      entityType,
      enterprise,
      userEmail,
      oldValues,
      newValues,
      eventName,
      eventFamily,
      module,
      subsystem,
      workflow,
      stage,
      severity,
      outcome,
      actorType,
      actorRoleSurface,
      targetType,
      targetId,
      requestId,
      traceId,
      correlationKey,
      retentionClass,
      redactionApplied,
    } = auditInput
    const requestedUserScopeId = auditInput.userScopeId
    const userScopeId =
      requestedUserScopeId ??
      (userEmail ? await findOrCreateTestingAuditUserByEmail(userEmail, seedKey) : null)
    const requestedEntityId = auditInput.entityId
    const entityId =
      requestedEntityId ??
      (entityType === 'user' && userScopeId ? userScopeId : `e2e-audit-target-${seedKey}`)
    const actorUserId = auditInput.actorUserId ?? userScopeId
    const organizationScopeId =
      auditInput.organizationScopeId ?? auditInput.targetOrganizationId ?? null
    const actorOrganizationId = auditInput.actorOrganizationId ?? organizationScopeId
    const targetOrganizationId = auditInput.targetOrganizationId ?? organizationScopeId
    const eventId = crypto.randomUUID()
    const occurredAt = new Date(timestamp)
    const insertData: Record<string, unknown> = {
      id: eventId,
      user_id: actorUserId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: '127.0.0.1',
      user_agent: 'playwright-e2e',
      occurred_at: occurredAt,
    }

    if (enterprise) {
      const prevHash = await getPreviousTestingAuditHash()
      const enterpriseValues: Record<string, unknown> = {
        event_name: eventName ?? action,
        event_family: eventFamily ?? 'e2e.enterprise',
        module: module ?? 'audit',
        subsystem: subsystem ?? 'console',
        workflow: workflow ?? 'audit_console',
        stage: stage ?? 'verified',
        severity: severity ?? 'info',
        outcome: outcome ?? 'success',
        actor_type: actorType ?? 'user',
        actor_user_id: actorUserId,
        actor_org_id: actorOrganizationId,
        actor_role_surface: actorRoleSurface ?? 'system',
        target_type: targetType ?? entityType,
        target_id: targetId ?? entityId,
        target_org_id: targetOrganizationId,
        request_id: requestId ?? `req-${seedKey}`,
        trace_id: traceId ?? `trace-${seedKey}`,
        correlation_key: correlationKey ?? `corr-${seedKey}`,
        retention_class: retentionClass ?? 'security_1y',
        redaction_applied: redactionApplied,
        schema_version: 2,
        prev_hash: prevHash,
      }

      for (const [column, value] of Object.entries(enterpriseValues)) {
        if (await testingDatabaseCleaner.columnExists('audit_events', column)) {
          insertData[column] = value
        }
      }

      if (await testingDatabaseCleaner.columnExists('audit_events', 'event_hash')) {
        const { occurred_at: _occurredAt, ...hashPayload } = insertData
        insertData['event_hash'] = computeAuditEventHash({
          event: {
            ...hashPayload,
            ...enterpriseValues,
          },
          prevHash,
        })
      }
    }

    await db.table('audit_events').insert(insertData)

    let scopes = auditInput.scopes
    if (enterprise && scopes.length === 0) {
      scopes = [
        { surface: 'system', user_id: null, organization_id: null },
        ...(organizationScopeId
          ? [
              {
                surface: 'organization' as const,
                user_id: null,
                organization_id: organizationScopeId,
              },
            ]
          : []),
        ...(userScopeId
          ? [{ surface: 'user' as const, user_id: userScopeId, organization_id: null }]
          : []),
      ]
    }

    scopes = uniqueTestingAuditScopes(scopes)
    if (enterprise && scopes.length > 0 && (await testingDatabaseCleaner.tableExists('audit_event_scopes'))) {
      await db.table('audit_event_scopes').insert(
        scopes.map((scope) => ({
          event_id: eventId,
          surface: scope.surface,
          user_id: scope.user_id,
          organization_id: scope.organization_id,
        }))
      )
    }

    response.status(201).json(
      wrapApiV1Data({
        id: eventId,
        action,
        entityType,
        entityId,
        eventName: insertData['event_name'] ?? null,
        requestId: insertData['request_id'] ?? null,
        traceId: insertData['trace_id'] ?? null,
        retentionClass: insertData['retention_class'] ?? null,
        actorUserId,
        organizationScopeId,
        userScopeId,
        timestamp,
      })
    )
  }
}
