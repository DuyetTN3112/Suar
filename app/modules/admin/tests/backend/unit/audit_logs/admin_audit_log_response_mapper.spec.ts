import { test } from '@japa/runner'

import { mapAdminAuditLogResponse } from '#modules/admin/audit_logs/controllers/mappers/response/audit_logs/admin_api_response_mapper'
import { computeAuditEventHash } from '#modules/audit/public_contracts/audit_event_hash'

test.group('Unit | Admin audit log response mapper', () => {
  test('extracts platform observability fields into investigation metadata', ({ assert }) => {
    const mapped = mapAdminAuditLogResponse({
      id: 'audit-1',
      user: {
        id: 'user-1',
        username: 'duyet',
      },
      action: 'review.dispute.resolved',
      resource_type: 'review_dispute',
      resource_id: 'dispute-1',
      details: {
        new_values: {
          event_name: 'review.dispute.resolved',
          event_family: 'workflow',
          module: 'reviews',
          subsystem: 'review_dispute',
          workflow: 'review_dispute_resolution',
          stage: 'completed',
          severity: 'info',
          outcome: 'success',
          actor: {
            initiator_type: 'user',
            user_id: 'user-1',
            organization_id: 'org-1',
          },
          request: {
            id: 'req-1',
          },
          trace: {
            id: 'trace-1',
            correlation_key: 'corr-1',
          },
          target: {
            type: 'review_dispute',
            id: 'dispute-1',
            scope: 'review_dispute_resolution',
          },
          runtime: {
            duration_ms: 182,
          },
          compliance: {
            retention_class: 'support_trace',
          },
        },
      },
      ip_address: '127.0.0.1',
      user_agent: 'integration-test',
      created_at: '2026-07-05T12:00:00.000Z',
    })

    assert.equal(mapped.investigation.isStructured, true)
    assert.equal(mapped.investigation.eventName, 'review.dispute.resolved')
    assert.equal(mapped.investigation.module, 'reviews')
    assert.equal(mapped.investigation.workflow, 'review_dispute_resolution')
    assert.equal(mapped.investigation.traceId, 'trace-1')
    assert.equal(mapped.investigation.durationMs, 182)
    assert.equal(mapped.investigation.retentionClass, 'support_trace')
    assert.include(mapped.investigation.summary, 'Review Dispute Resolved')
  })

  test('falls back to readable audit summary for legacy audit rows', ({ assert }) => {
    const mapped = mapAdminAuditLogResponse({
      id: 'audit-legacy',
      user: null,
      action: 'task_status_change',
      resource_type: 'task',
      resource_id: 'task-1',
      details: {
        old_values: { status: 'todo' },
        new_values: { status: 'done' },
      },
      ip_address: '127.0.0.1',
      user_agent: 'integration-test',
      created_at: '2026-07-05T12:00:00.000Z',
    })

    assert.equal(mapped.investigation.isStructured, false)
    assert.equal(mapped.investigation.module, null)
    assert.equal(mapped.investigation.summary, 'Task Status Change Task #task-1')
    assert.equal(mapped.investigation.integrity.status, 'legacy_unsealed')
    assert.equal(mapped.investigation.integrity.schemaVersion, 1)
  })

  test('merges enterprise columns with runtime evidence and verifies the sealed event hash', ({
    assert,
  }) => {
    const prevHash = 'a'.repeat(64)
    const hashPayload = {
      id: 'audit-sealed',
      user_id: '11111111-1111-4111-8111-111111111111',
      action: 'admin.user.suspended',
      entity_type: 'user',
      entity_id: '22222222-2222-4222-8222-222222222222',
      old_values: { status: 'active', api_token: '[REDACTED]' },
      new_values: {
        runtime: { duration_ms: 84 },
        error: { class: 'PolicyWarning', message: 'Manual review required' },
        target: { type: 'user', id: '22222222-2222-4222-8222-222222222222' },
        compliance: { retention_class: 'security_audit', redaction_applied: true },
      },
      ip_address: '203.0.113.10',
      user_agent: 'admin-browser',
      event_name: 'admin.user.suspended',
      event_family: 'access',
      module: 'admin',
      subsystem: 'users',
      workflow: 'user_governance',
      stage: 'completed',
      severity: 'warn',
      outcome: 'success',
      actor_type: 'user',
      actor_user_id: '11111111-1111-4111-8111-111111111111',
      actor_org_id: null,
      actor_role_surface: 'superadmin',
      target_type: 'user',
      target_id: '22222222-2222-4222-8222-222222222222',
      target_org_id: null,
      request_id: 'req-sealed',
      trace_id: 'trace-sealed',
      correlation_key: 'corr-sealed',
      retention_class: 'security_audit',
      source_occurred_at: '2026-07-23T09:59:58.000Z',
      redaction_applied: true,
      schema_version: 3,
      prev_hash: prevHash,
    }
    const eventHash = computeAuditEventHash({
      event: hashPayload,
      prevHash,
    })

    const mapped = mapAdminAuditLogResponse({
      id: hashPayload.id,
      source_user_id: hashPayload.user_id,
      user: { id: hashPayload.user_id, username: 'platform_admin' },
      action: hashPayload.action,
      resource_type: hashPayload.entity_type,
      resource_id: hashPayload.entity_id,
      details: {
        old_values: hashPayload.old_values,
        new_values: hashPayload.new_values,
      },
      ip_address: hashPayload.ip_address,
      user_agent: hashPayload.user_agent,
      created_at: '2026-07-23T10:00:00.000Z',
      event_name: hashPayload.event_name,
      event_family: hashPayload.event_family,
      module: hashPayload.module,
      subsystem: hashPayload.subsystem,
      workflow: hashPayload.workflow,
      stage: hashPayload.stage,
      severity: hashPayload.severity,
      outcome: hashPayload.outcome,
      actor_type: hashPayload.actor_type,
      actor_user_id: hashPayload.actor_user_id,
      actor_org_id: hashPayload.actor_org_id,
      actor_role_surface: hashPayload.actor_role_surface,
      target_type: hashPayload.target_type,
      target_id: hashPayload.target_id,
      target_label: 'review_target',
      target_org_id: hashPayload.target_org_id,
      request_id: hashPayload.request_id,
      trace_id: hashPayload.trace_id,
      correlation_key: hashPayload.correlation_key,
      retention_class: hashPayload.retention_class,
      source_occurred_at: hashPayload.source_occurred_at,
      redaction_applied: hashPayload.redaction_applied,
      schema_version: hashPayload.schema_version,
      event_hash: eventHash,
      prev_hash: prevHash,
    })

    assert.equal(mapped.investigation.durationMs, 84)
    assert.equal(mapped.investigation.errorClass, 'PolicyWarning')
    assert.equal(mapped.investigation.errorMessage, 'Manual review required')
    assert.equal(mapped.investigation.actorRoleSurface, 'superadmin')
    assert.equal(mapped.investigation.targetLabel, 'review_target')
    assert.equal(mapped.sourceOccurredAt, hashPayload.source_occurred_at)
    assert.equal(mapped.investigation.integrity.status, 'verified')
    assert.equal(mapped.investigation.integrity.eventHash, eventHash)
    assert.isTrue(mapped.investigation.integrity.redactionApplied)
    assert.isFalse(mapped.investigation.integrity.defensiveRedactionApplied)
  })

  test('defensively redacts legacy secrets and marks a tampered sealed event', ({ assert }) => {
    const mapped = mapAdminAuditLogResponse({
      id: 'audit-tampered',
      user: null,
      action: 'integration.updated',
      resource_type: 'integration',
      resource_id: 'integration-1',
      details: {
        old_values: {
          api_token: 'secret-before',
          nested: { client_secret: 'private-before' },
        },
        new_values: {
          api_token: 'secret-after',
          nested: { client_secret: 'private-after' },
          error: {
            message: 'Authorization: Bearer raw-credential-value',
          },
        },
      },
      ip_address: '203.0.113.11',
      user_agent: 'admin-browser',
      created_at: '2026-07-23T10:05:00.000Z',
      event_name: 'integration.updated',
      module: 'integrations',
      target_type: 'integration',
      target_id: 'integration-1',
      schema_version: 2,
      event_hash: '0'.repeat(64),
      prev_hash: 'f'.repeat(64),
    })

    assert.deepEqual(mapped.details.oldValues, {
      api_token: '[REDACTED]',
      nested: { client_secret: '[REDACTED]' },
    })
    assert.deepEqual(mapped.details.newValues, {
      api_token: '[REDACTED]',
      nested: { client_secret: '[REDACTED]' },
      error: {
        message: 'Authorization: [REDACTED]',
      },
    })
    assert.equal(mapped.investigation.integrity.status, 'mismatch')
    assert.isFalse(mapped.investigation.integrity.redactionApplied)
    assert.isTrue(mapped.investigation.integrity.defensiveRedactionApplied)
    assert.notInclude(mapped.investigation.errorMessage ?? '', 'raw-credential-value')
    assert.include(mapped.investigation.errorMessage ?? '', '[REDACTED]')
    assert.notInclude(JSON.stringify(mapped), 'secret-before')
    assert.notInclude(JSON.stringify(mapped), 'private-after')
    assert.notInclude(JSON.stringify(mapped), 'raw-credential-value')
  })
})
