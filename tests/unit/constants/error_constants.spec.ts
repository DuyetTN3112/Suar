import { test } from '@japa/runner'
import { ErrorCode, ErrorMessages, HttpStatus } from '#constants/error_constants'

test.group('ErrorConstants', () => {
  test('ErrorCode enum maps to exception class codes', ({ assert }) => {
    assert.equal(ErrorCode.UNAUTHORIZED, 'E_UNAUTHORIZED')
    assert.equal(ErrorCode.FORBIDDEN, 'E_FORBIDDEN')
    assert.equal(ErrorCode.NOT_FOUND, 'E_NOT_FOUND')
    assert.equal(ErrorCode.CONFLICT, 'E_CONFLICT')
    assert.equal(ErrorCode.VALIDATION, 'E_VALIDATION')
    assert.equal(ErrorCode.BUSINESS_LOGIC, 'E_BUSINESS_LOGIC')
    assert.equal(ErrorCode.RATE_LIMIT, 'E_RATE_LIMIT')
    assert.equal(ErrorCode.INTERNAL, 'E_INTERNAL_ERROR')
    assert.equal(ErrorCode.CSRF_EXPIRED, 'E_CSRF_EXPIRED')
  })

  test('ErrorMessages has non-empty strings for all keys', ({ assert }) => {
    for (const [key, value] of Object.entries(ErrorMessages)) {
      assert.isString(value, `ErrorMessages.${key} should be a string`)
      assert.isAbove(value.length, 0, `ErrorMessages.${key} should not be empty`)
    }
  })

  test('HttpStatus has standard HTTP codes', ({ assert }) => {
    assert.equal(HttpStatus.OK, 200)
    assert.equal(HttpStatus.CREATED, 201)
    assert.equal(HttpStatus.BAD_REQUEST, 400)
    assert.equal(HttpStatus.NOT_FOUND, 404)
  })

  test('ErrorMessages covers auth errors', ({ assert }) => {
    assert.property(ErrorMessages, 'UNAUTHORIZED')
    assert.property(ErrorMessages, 'PLEASE_LOGIN')
    assert.property(ErrorMessages, 'SESSION_EXPIRED')
  })

  test('ErrorMessages covers resource errors', ({ assert }) => {
    assert.property(ErrorMessages, 'NOT_FOUND')
    assert.property(ErrorMessages, 'USER_NOT_FOUND')
    assert.property(ErrorMessages, 'ORGANIZATION_NOT_FOUND')
    assert.property(ErrorMessages, 'PROJECT_NOT_FOUND')
    assert.property(ErrorMessages, 'TASK_NOT_FOUND')
  })

  test('ErrorMessages covers validation errors', ({ assert }) => {
    assert.property(ErrorMessages, 'INVALID_INPUT')
    assert.property(ErrorMessages, 'FIELD_REQUIRED')
    assert.property(ErrorMessages, 'NO_CHANGES')
  })

  test('ErrorMessages covers conflict errors', ({ assert }) => {
    assert.property(ErrorMessages, 'ALREADY_EXISTS')
    assert.property(ErrorMessages, 'ALREADY_APPLIED')
  })
})
