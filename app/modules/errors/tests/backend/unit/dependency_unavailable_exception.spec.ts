import { test } from '@japa/runner'

import DependencyUnavailableException from '#modules/errors/public_contracts/dependency_unavailable_exception'
import {
  ErrorCode,
  ErrorMessages,
  HttpStatus,
} from '#modules/errors/public_contracts/error_constants'

test.group('DependencyUnavailableException', () => {
  test('classifies infrastructure outages as safe retryable 503 failures', ({ assert }) => {
    const cause = new Error('redis password=secret connection refused')
    const error = new DependencyUnavailableException('redis', 'session_access_read', {
      cause,
    })

    assert.equal(error.status, HttpStatus.SERVICE_UNAVAILABLE)
    assert.equal(error.code, ErrorCode.SERVICE_UNAVAILABLE)
    assert.equal(error.category, 'dependency')
    assert.equal(error.safeMessage, ErrorMessages.SERVICE_UNAVAILABLE)
    assert.isTrue(error.retryable)
    assert.isTrue(error.shouldReport)
    assert.equal(error.cause, cause)
    assert.deepEqual(error.details, {
      dependency: 'redis',
      operation: 'session_access_read',
    })
    assert.notInclude(error.safeMessage, 'secret')
  })
})
