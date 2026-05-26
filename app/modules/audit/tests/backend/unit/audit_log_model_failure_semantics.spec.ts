import { test } from '@japa/runner'

import type { AuditLogRepository } from '#modules/audit/actions/ports/outbound/audit_log_repository'
import AuditLog from '#modules/audit/infra/models/audit-log/audit_log'
import { auditRepositoryProvider } from '#modules/audit/infra/repositories/audit-log/audit_repository_provider'

test.group('AuditLog model failure semantics', () => {
  test('propagates repository failures instead of pretending an audit write succeeded', async ({
    assert,
    cleanup,
  }) => {
    const originalResolver = auditRepositoryProvider.getAuditLogRepository
    const dependencyFailure = new Error('audit repository unavailable')
    const provider = auditRepositoryProvider as {
      getAuditLogRepository: () => AuditLogRepository
    }

    provider.getAuditLogRepository = () =>
      ({
        create: () => Promise.reject(dependencyFailure),
      }) as unknown as AuditLogRepository
    cleanup(() => {
      provider.getAuditLogRepository = originalResolver
    })

    await assert.rejects(
      () =>
        AuditLog.create({
          action: 'test.audit',
          entity_type: 'test_entity',
        }),
      /audit repository unavailable/
    )
  })

  test('propagates repository failures instead of presenting an empty audit trail', async ({
    assert,
    cleanup,
  }) => {
    const originalResolver = auditRepositoryProvider.getAuditLogRepository
    const dependencyFailure = new Error('audit repository unavailable')
    const provider = auditRepositoryProvider as {
      getAuditLogRepository: () => AuditLogRepository
    }

    provider.getAuditLogRepository = () =>
      ({
        findMany: () => Promise.reject(dependencyFailure),
      }) as unknown as AuditLogRepository
    cleanup(() => {
      provider.getAuditLogRepository = originalResolver
    })

    await assert.rejects(() => AuditLog.find({}), /audit repository unavailable/)
  })
})
