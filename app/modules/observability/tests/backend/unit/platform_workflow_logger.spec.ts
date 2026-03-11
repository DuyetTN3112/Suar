import { test } from '@japa/runner'

import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_event'
import { PlatformWorkflowLogger } from '#modules/observability/public_contracts/platform_workflow_logger'

const execCtx: AuditActionContext = {
  userId: 'user-1',
  organizationId: 'organization-1',
  ip: '127.0.0.1',
  userAgent: 'test',
}

const event: PlatformEvent = {
  event_name: 'review.workflow.completed',
  event_family: 'workflow',
  module: 'reviews',
  subsystem: 'review_workflow',
  workflow: 'review_workflow',
  stage: 'completed',
  severity: 'info',
  outcome: 'success',
  occurred_at: '2026-07-31T00:00:00.000Z',
  actor: {
    initiator_type: 'user',
    user_id: execCtx.userId,
    organization_id: execCtx.organizationId,
  },
  request: {
    id: 'request-1',
    ip: execCtx.ip,
    user_agent: execCtx.userAgent,
  },
  trace: {
    id: 'request-1',
    workflow_id: 'review_workflow',
  },
  target: null,
  change: null,
  runtime: null,
  error: null,
  compliance: {
    redaction_applied: true,
    retention_class: 'support_trace',
  },
}

test.group('PlatformWorkflowLogger.checkpointSafely', () => {
  test('isolates both primary sinks and does not log raw diagnostics', async ({ assert }) => {
    const fallbackPayloads: Record<string, unknown>[] = []
    let auditAttempts = 0
    const workflowLogger = new PlatformWorkflowLogger(
      {
        log() {
          throw new Error('token=operational-secret')
        },
      },
      {
        record() {
          auditAttempts += 1
          return Promise.reject(new Error('password=audit-secret'))
        },
      },
      {
        logStructured(_level, _eventName, payload) {
          fallbackPayloads.push(payload)
        },
      }
    )

    await workflowLogger.checkpointSafely(execCtx, event)

    assert.equal(auditAttempts, 1)
    assert.lengthOf(fallbackPayloads, 2)
    assert.notInclude(JSON.stringify(fallbackPayloads), 'operational-secret')
    assert.notInclude(JSON.stringify(fallbackPayloads), 'audit-secret')
  })

  test('cannot fail the workflow when the fallback logger also throws', async ({ assert }) => {
    const workflowLogger = new PlatformWorkflowLogger(
      {
        log() {
          throw new Error('operational sink failed')
        },
      },
      {
        record() {
          return Promise.reject(new Error('audit sink failed'))
        },
      },
      {
        logStructured() {
          throw new Error('fallback sink failed')
        },
      }
    )

    await workflowLogger.checkpointSafely(execCtx, event)
    assert.isTrue(true)
  })
})
