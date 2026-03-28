import { test } from '@japa/runner'

import {
  ErrorCode,
  ErrorMessages,
  HttpStatus,
  createApiError,
} from '#modules/errors/public_contracts/error_constants'

test.group('Error constants', () => {
  test('createApiError emits stable payload with optional details only when present', ({
    assert,
  }) => {
    const withDetails = createApiError(
      ErrorCode.VALIDATION,
      ErrorMessages.INVALID_INPUT,
      { email: 'Invalid' },
      { request_id: 'req-1' }
    )
    const withoutDetails = createApiError(
      ErrorCode.NOT_FOUND,
      ErrorMessages.NOT_FOUND,
      {},
      {}
    )

    assert.deepEqual(withDetails, {
      success: false,
      error: {
        code: ErrorCode.VALIDATION,
        message: ErrorMessages.INVALID_INPUT,
        errors: { email: 'Invalid' },
      },
      meta: {
        request_id: 'req-1',
      },
    })
    assert.deepEqual(withoutDetails, {
      success: false,
      error: {
        code: ErrorCode.NOT_FOUND,
        message: ErrorMessages.NOT_FOUND,
      },
    })
    assert.equal(HttpStatus.UNPROCESSABLE_ENTITY, 422)
  })
})
