import { test } from '@japa/runner'
import {
  AppError,
  isError,
  isAppError,
  getErrorMessage,
  getErrorCode,
  getErrorStatusCode,
  serializeError,
} from '#libs/error_utils'

// ============================================================================
// AppError construction
// ============================================================================
test.group('AppError', () => {
  test('creates with default options', ({ assert }) => {
    const err = new AppError('Test error')
    assert.equal(err.message, 'Test error')
    assert.equal(err.code, 'UNKNOWN_ERROR')
    assert.equal(err.statusCode, 500)
    assert.isTrue(err.isOperational)
    assert.equal(err.name, 'AppError')
  })

  test('creates with custom options', ({ assert }) => {
    const err = new AppError('Custom', {
      code: 'CUSTOM',
      statusCode: 400,
      isOperational: false,
      metadata: { field: 'email' },
    })
    assert.equal(err.code, 'CUSTOM')
    assert.equal(err.statusCode, 400)
    assert.isFalse(err.isOperational)
    assert.deepEqual(err.metadata, { field: 'email' })
  })

  test('sets cause from options', ({ assert }) => {
    const cause = new Error('root cause')
    const err = new AppError('Wrapper', { cause })
    assert.equal(err.cause, cause)
  })
})

// ============================================================================
// AppError factory methods
// ============================================================================
test.group('AppError factories', () => {
  test('notFound with resource and id', ({ assert }) => {
    const err = AppError.notFound('Dự án', 123)
    assert.equal(err.statusCode, 404)
    assert.equal(err.code, 'NOT_FOUND')
    assert.include(err.message, 'Dự án')
    assert.include(err.message, '123')
  })

  test('notFound without id', ({ assert }) => {
    const err = AppError.notFound('Dự án')
    assert.equal(err.statusCode, 404)
    assert.include(err.message, 'không tồn tại')
  })

  test('forbidden with default message', ({ assert }) => {
    const err = AppError.forbidden()
    assert.equal(err.statusCode, 403)
    assert.equal(err.code, 'FORBIDDEN')
  })

  test('forbidden with custom message', ({ assert }) => {
    const err = AppError.forbidden('Custom forbidden')
    assert.equal(err.message, 'Custom forbidden')
  })

  test('validation with field', ({ assert }) => {
    const err = AppError.validation('Email invalid', 'email')
    assert.equal(err.statusCode, 400)
    assert.equal(err.code, 'VALIDATION_ERROR')
    assert.deepEqual(err.metadata, { field: 'email' })
  })

  test('validation without field', ({ assert }) => {
    const err = AppError.validation('Some error')
    assert.isUndefined(err.metadata)
  })

  test('unauthorized with default message', ({ assert }) => {
    const err = AppError.unauthorized()
    assert.equal(err.statusCode, 401)
    assert.equal(err.code, 'UNAUTHORIZED')
  })

  test('conflict with field', ({ assert }) => {
    const err = AppError.conflict('User', 'email')
    assert.equal(err.statusCode, 409)
    assert.equal(err.code, 'CONFLICT')
    assert.include(err.message, 'email')
  })

  test('conflict without field', ({ assert }) => {
    const err = AppError.conflict('User')
    assert.include(err.message, 'đã tồn tại')
  })

  test('internal with default message', ({ assert }) => {
    const err = AppError.internal()
    assert.equal(err.statusCode, 500)
    assert.equal(err.code, 'INTERNAL_ERROR')
    assert.isFalse(err.isOperational)
  })

  test('internal with custom message', ({ assert }) => {
    const err = AppError.internal('DB connection failed')
    assert.equal(err.message, 'DB connection failed')
  })
})

// ============================================================================
// Type guards
// ============================================================================
test.group('isError', () => {
  test('returns true for Error', ({ assert }) => {
    assert.isTrue(isError(new Error('test')))
  })

  test('returns true for AppError', ({ assert }) => {
    assert.isTrue(isError(new AppError('test')))
  })

  test('returns false for string', ({ assert }) => {
    assert.isFalse(isError('not an error'))
  })

  test('returns false for null', ({ assert }) => {
    assert.isFalse(isError(null))
  })
})

test.group('isAppError', () => {
  test('returns true for AppError', ({ assert }) => {
    assert.isTrue(isAppError(new AppError('test')))
  })

  test('returns false for regular Error', ({ assert }) => {
    assert.isFalse(isAppError(new Error('test')))
  })

  test('returns false for plain object', ({ assert }) => {
    assert.isFalse(isAppError({ message: 'test', code: 'ERR' }))
  })
})

// ============================================================================
// getErrorMessage
// ============================================================================
test.group('getErrorMessage', () => {
  test('extracts message from Error', ({ assert }) => {
    assert.equal(getErrorMessage(new Error('hello')), 'hello')
  })

  test('extracts message from AppError', ({ assert }) => {
    assert.equal(getErrorMessage(new AppError('app error')), 'app error')
  })

  test('returns string directly', ({ assert }) => {
    assert.equal(getErrorMessage('string error'), 'string error')
  })

  test('extracts message from object with message property', ({ assert }) => {
    assert.equal(getErrorMessage({ message: 'obj error' }), 'obj error')
  })

  test('returns fallback for unknown types', ({ assert }) => {
    assert.equal(getErrorMessage(42), 'Có lỗi xảy ra')
  })

  test('returns custom fallback', ({ assert }) => {
    assert.equal(getErrorMessage(null, 'Custom fallback'), 'Custom fallback')
  })
})

// ============================================================================
// getErrorCode
// ============================================================================
test.group('getErrorCode', () => {
  test('extracts code from AppError', ({ assert }) => {
    const err = new AppError('test', { code: 'MY_CODE' })
    assert.equal(getErrorCode(err), 'MY_CODE')
  })

  test('extracts code from object with code property', ({ assert }) => {
    assert.equal(getErrorCode({ code: 'ERR_CODE' }), 'ERR_CODE')
  })

  test('returns undefined for regular Error', ({ assert }) => {
    assert.isUndefined(getErrorCode(new Error('test')))
  })

  test('returns undefined for null', ({ assert }) => {
    assert.isUndefined(getErrorCode(null))
  })
})

// ============================================================================
// getErrorStatusCode
// ============================================================================
test.group('getErrorStatusCode', () => {
  test('extracts statusCode from AppError', ({ assert }) => {
    const err = AppError.notFound('Test')
    assert.equal(getErrorStatusCode(err), 404)
  })

  test('extracts statusCode from object', ({ assert }) => {
    assert.equal(getErrorStatusCode({ statusCode: 422 }), 422)
  })

  test('extracts status from object', ({ assert }) => {
    assert.equal(getErrorStatusCode({ status: 403 }), 403)
  })

  test('returns default 500 for unknown', ({ assert }) => {
    assert.equal(getErrorStatusCode('string'), 500)
  })

  test('returns custom fallback', ({ assert }) => {
    assert.equal(getErrorStatusCode(null, 404), 404)
  })
})

// ============================================================================
// serializeError
// ============================================================================
test.group('serializeError', () => {
  test('serializes AppError', ({ assert }) => {
    const err = new AppError('Test', { code: 'TEST_ERR' })
    const result = serializeError(err)
    assert.equal(result.error, 'Test')
    assert.equal(result.code, 'TEST_ERR')
  })

  test('serializes regular Error', ({ assert }) => {
    const result = serializeError(new Error('Regular error'))
    assert.equal(result.error, 'Regular error')
  })

  test('serializes unknown value', ({ assert }) => {
    const result = serializeError(42)
    assert.equal(result.error, 'Có lỗi xảy ra')
  })
})
