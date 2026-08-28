import { describe, expect, it } from 'vitest'

import { buildAdminAuditLogConsoleModel } from '@/apps/admin/modules/audit_logs/console_model'

describe('buildAdminAuditLogConsoleModel', () => {
  it('builds investigation summaries, facets, and filtered rows from mapped audit logs', () => {
    const model = buildAdminAuditLogConsoleModel(
      [
        {
          id: 'audit-1',
          user: { id: 'user-1', username: 'duyet' },
          action: 'review.dispute.resolved',
          resourceType: 'review_dispute',
          resourceId: 'dispute-1',
          details: { oldValues: {}, newValues: {} },
          ipAddress: '127.0.0.1',
          userAgent: 'browser',
          createdAt: '2026-07-05T12:00:00.000Z',
          investigation: {
            isStructured: true,
            eventName: 'review.dispute.resolved',
            eventFamily: 'workflow',
            module: 'reviews',
            subsystem: 'review_dispute',
            workflow: 'review_dispute_resolution',
            stage: 'completed',
            severity: 'info',
            outcome: 'success',
            traceId: 'trace-1',
            correlationKey: 'corr-1',
            frontendSubmissionId: null,
            requestId: 'req-1',
            initiatorType: 'user',
            actorUserId: 'user-1',
            actorOrganizationId: 'org-1',
            actorRoleSurface: 'system_admin',
            targetType: 'review_dispute',
            targetId: 'dispute-1',
            targetLabel: 'Release policy dispute',
            targetOrganizationId: 'org-1',
            targetScope: 'review_dispute_resolution',
            retentionClass: 'support_trace',
            durationMs: 180,
            errorClass: null,
            errorMessage: null,
            integrity: {
              status: 'verified',
              eventHash: 'a'.repeat(64),
              previousHash: 'b'.repeat(64),
              schemaVersion: 2,
              redactionApplied: false,
              defensiveRedactionApplied: false,
            },
            summary: 'Review dispute resolved',
          },
        },
        {
          id: 'audit-2',
          user: null,
          action: 'notifications.feed.failed',
          resourceType: 'notification_feed',
          resourceId: null,
          details: { oldValues: {}, newValues: {} },
          ipAddress: '127.0.0.1',
          userAgent: 'system',
          createdAt: '2026-07-05T12:10:00.000Z',
          investigation: {
            isStructured: true,
            eventName: 'notifications.feed.failed',
            eventFamily: 'query',
            module: 'notifications',
            subsystem: 'notification_center',
            workflow: 'notification_feed_load',
            stage: 'failed',
            severity: 'warn',
            outcome: 'failure',
            traceId: 'trace-2',
            correlationKey: 'corr-2',
            frontendSubmissionId: null,
            requestId: 'req-2',
            initiatorType: 'system',
            actorUserId: null,
            actorOrganizationId: null,
            actorRoleSurface: null,
            targetType: 'notification_feed',
            targetId: null,
            targetLabel: null,
            targetOrganizationId: null,
            targetScope: 'notification_feed_load',
            retentionClass: 'support_trace',
            durationMs: 55,
            errorClass: 'Error',
            errorMessage: 'table missing',
            integrity: {
              status: 'mismatch',
              eventHash: 'c'.repeat(64),
              previousHash: 'd'.repeat(64),
              schemaVersion: 2,
              redactionApplied: true,
              defensiveRedactionApplied: true,
            },
            summary: 'Notifications feed failed',
          },
        },
      ],
      {
        severity: '',
        module: '',
        workflow: '',
        outcome: '',
      }
    )

    expect(model.summary.total).toBe(2)
    expect(model.summary.failedCount).toBe(1)
    expect(model.summary.warningCount).toBe(1)
    expect(model.summary.structuredCount).toBe(2)
    expect(model.summary.uniqueTraceCount).toBe(2)
    expect(model.summary.verifiedCount).toBe(1)
    expect(model.summary.integrityMismatchCount).toBe(1)
    expect(model.summary.legacyUnsealedCount).toBe(0)
    expect(model.modules).toEqual(['reviews', 'notifications'])
    expect(model.workflows).toEqual(['review_dispute_resolution', 'notification_feed_load'])
    expect(model.topModules[0]).toEqual({ label: 'Reviews', count: 1 })
    expect(model.topActors[0]).toEqual({ label: 'duyet', count: 1 })
    expect(model.localPivotRows[1]?.severityLabel).toBe('Warn')
    expect(model.localPivotRows[1]?.integrityLabel).toBe('Hash mismatch')
    expect(model.localPivotRows[0]?.targetLabel).toBe('Release policy dispute')
    expect(model.failingWorkflows[0]).toEqual({ label: 'Notification Feed Load', count: 1 })
    expect(model.traceHotspots[0]).toEqual({ label: 'trace-1', count: 1 })
    expect(model.slowestEvents[0]).toMatchObject({
      id: 'audit-1',
      durationMs: 180,
      moduleLabel: 'Reviews',
      workflowLabel: 'Review Dispute Resolution',
    })
  })
})
