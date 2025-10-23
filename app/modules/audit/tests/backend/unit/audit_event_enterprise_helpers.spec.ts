import { test } from '@japa/runner'

import { computeAuditEventHash } from '#modules/audit/domain/audit_event_hash'
import { redactAuditValue } from '#modules/audit/domain/audit_event_redaction'
import { deriveAuditEventScopes } from '#modules/audit/domain/audit_event_scope'

test.group('Unit | Enterprise audit helpers', () => {
  test('redacts sensitive fields recursively', ({ assert }) => {
    const result = redactAuditValue({
      email: 'person@example.com',
      password: 'secret',
      nested: { refresh_token: 'token-1' },
      entries: [{ authorization: 'Bearer token' }, { display_name: 'Visible' }],
    })

    assert.isTrue(result.redactionApplied)
    assert.deepEqual(result.value, {
      email: 'person@example.com',
      password: '[REDACTED]',
      nested: { refresh_token: '[REDACTED]' },
      entries: [{ authorization: '[REDACTED]' }, { display_name: 'Visible' }],
    })
  })

  test('computes stable hash independent of object key order', ({ assert }) => {
    const left = computeAuditEventHash({
      event: { action: 'user.updated', target: { id: 'user-1', type: 'user' } },
      prevHash: 'previous-hash',
    })
    const right = computeAuditEventHash({
      event: { target: { type: 'user', id: 'user-1' }, action: 'user.updated' },
      prevHash: 'previous-hash',
    })

    assert.equal(left, right)
    assert.match(left, /^[a-f0-9]{64}$/)
  })

  test('derives system user and organization scopes', ({ assert }) => {
    const scopes = deriveAuditEventScopes({
      actorUserId: 'user-1',
      actorOrganizationId: 'org-1',
      targetType: 'task',
      targetId: 'task-1',
      targetOrganizationId: 'org-1',
      affectedUserIds: ['user-2', 'user-1'],
    })

    assert.deepEqual(scopes, [
      { surface: 'system', userId: null, organizationId: null },
      { surface: 'user', userId: 'user-1', organizationId: null },
      { surface: 'user', userId: 'user-2', organizationId: null },
      { surface: 'organization', userId: null, organizationId: 'org-1' },
    ])
  })
})
