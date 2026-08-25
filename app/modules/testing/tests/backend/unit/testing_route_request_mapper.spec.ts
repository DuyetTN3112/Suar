import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildTestingAuditScopeArrayInput,
  buildTestingAuditSeedRequest,
  buildTestingBooleanInput,
  buildTestingCacheStatusRequest,
  buildTestingCleanupRequest,
  buildTestingEnumInput,
  buildTestingPeerCountInput,
  buildTestingOptionalStringInput,
  buildTestingSearchTaskCountInput,
  buildTestingSeedRequest,
  buildTestingStringArrayInput,
} from '#modules/testing/controllers/mappers/request/testing-auth/testing_route_request_mapper'

test.group('', () => {
  test('maps common seed timestamp and nonce without coercing invalid values silently', ({
    assert,
  }) => {
    const mapped = buildTestingSeedRequest(
      { timestamp: '1700000000000', nonce: 'run-1' },
      { timestamp: 1, nonce: 'default' }
    )
    assert.deepEqual(mapped, {
      timestamp: 1700000000000,
      nonce: 'run-1',
      seedKey: '1700000000000-run-1',
    })
    assert.throws(
      () =>
        buildTestingSeedRequest({ timestamp: 'not-a-time' }, { timestamp: 1, nonce: 'default' }),
      ValidationException
    )
  })

  test('maps boolean, enum, and bounded peer count fields', ({ assert }) => {
    assert.isFalse(buildTestingBooleanInput({ demoNames: 'false' }, 'demoNames', true))
    assert.isTrue(buildTestingBooleanInput({}, 'demoNames', true))
    assert.equal(
      buildTestingEnumInput({ mode: 'active' }, 'mode', 'planning', ['planning', 'active']),
      'active'
    )
    assert.equal(buildTestingPeerCountInput({ peerCount: '2' }), 2)
    assert.throws(() => buildTestingPeerCountInput({ peerCount: '9' }), ValidationException)
    assert.equal(buildTestingSearchTaskCountInput({ searchTaskCount: '25' }), 25)
    assert.throws(
      () => buildTestingSearchTaskCountInput({ searchTaskCount: 33 }),
      ValidationException
    )
    assert.throws(
      () => buildTestingBooleanInput({ demoNames: 'no' }, 'demoNames', false),
      ValidationException
    )
    assert.throws(
      () => buildTestingEnumInput({ mode: 'unknown' }, 'mode', 'planning', ['planning', 'active']),
      ValidationException
    )
  })

  test('validates arrays, audit scopes, and canonical audit inputs', ({ assert }) => {
    assert.deepEqual(buildTestingAuditScopeArrayInput({ scopeIds: [' a ', 'a', 'b'] }), ['a', 'b'])
    assert.throws(
      () => buildTestingAuditScopeArrayInput({ scopeIds: ['a', 2] }),
      ValidationException
    )
    const audit = buildTestingAuditSeedRequest(
      {
        timestamp: 1700000000000,
        nonce: 'audit',
        enterprise: true,
        entityType: 'organization',
        scopes: [{ surface: 'organization', organizationId: 'org-1' }],
      },
      { timestamp: 1, nonce: 'default' }
    )
    assert.equal(audit.entityType, 'organization')
    assert.deepEqual(audit.scopes, [
      { surface: 'organization', user_id: null, organization_id: 'org-1' },
    ])
    assert.throws(
      () =>
        buildTestingAuditSeedRequest(
          { scopes: [{ surface: 'invalid' }] },
          { timestamp: 1, nonce: 'default' }
        ),
      ValidationException
    )
    assert.throws(
      () =>
        buildTestingAuditSeedRequest(
          { action: 'x'.repeat(256) },
          { timestamp: 1, nonce: 'default' }
        ),
      ValidationException
    )
    assert.throws(
      () =>
        buildTestingAuditSeedRequest(
          { scopes: new Array(33).fill({ surface: 'system' }) },
          { timestamp: 1, nonce: 'default' }
        ),
      ValidationException
    )
  })

  test('maps cache status operation as a canonical enum', ({ assert }) => {
    assert.deepEqual(buildTestingCacheStatusRequest({ taskId: 'task-1' }), {
      taskId: 'task-1',
      operation: 'UPDATE',
    })
    assert.throws(
      () => buildTestingCacheStatusRequest({ taskId: 'task-1', operation: 'DELETE' }),
      ValidationException
    )
    assert.throws(
      () =>
        buildTestingStringArrayInput({ scopeIds: ['x'.repeat(129)] }, 'scopeIds', {
          itemMaxLength: 128,
        }),
      ValidationException
    )
  })

  test('requires a recognizable cleanup token before deleting test data', ({ assert }) => {
    assert.deepEqual(buildTestingCleanupRequest({ timestamp: 1700000000000 }), ['1700000000000'])
    assert.deepEqual(buildTestingCleanupRequest({ tokens: ['seed-run-1', 'seed-run-1'] }), [
      'seed-run-1',
    ])
    assert.throws(
      () => buildTestingCleanupRequest({ timestamp: 'not-a-token' }),
      ValidationException
    )
    assert.throws(() => buildTestingCleanupRequest({ nested: ['seed-run-1'] }), ValidationException)
  })

  test('rejects malformed top-level bodies, oversized seed values, and marker types', ({
    assert,
  }) => {
    assert.throws(
      () => buildTestingSeedRequest([], { timestamp: 1, nonce: 'default' }),
      ValidationException
    )
    assert.throws(
      () => buildTestingSeedRequest({ nonce: 'x'.repeat(65) }, { timestamp: 1, nonce: 'default' }),
      ValidationException
    )
    assert.equal(
      buildTestingOptionalStringInput({ searchMarker: ' marker ' }, 'searchMarker', {
        maxLength: 16,
      }),
      'marker'
    )
    assert.throws(
      () => buildTestingOptionalStringInput({ searchMarker: 42 }, 'searchMarker'),
      ValidationException
    )
    assert.throws(
      () =>
        buildTestingOptionalStringInput({ searchMarker: 'x'.repeat(17) }, 'searchMarker', {
          maxLength: 16,
        }),
      ValidationException
    )
  })
})
