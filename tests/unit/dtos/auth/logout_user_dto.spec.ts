import { test } from '@japa/runner'
import { LogoutUserDTO } from '#actions/auth/dtos/logout_user_dto'
import ValidationException from '#exceptions/validation_exception'

/**
 * Tests for LogoutUserDTO — Auth DTO validation.
 * No database required.
 */

// ============================================================================
// Valid construction
// ============================================================================

test.group('LogoutUserDTO | valid', () => {
  test('constructs with valid userId and ipAddress', ({ assert }) => {
    const dto = new LogoutUserDTO({
      userId: 1,
      ipAddress: '192.168.1.1',
    })
    assert.equal(dto.userId, 1)
    assert.equal(dto.ipAddress, '192.168.1.1')
  })

  test('sessionId is optional', ({ assert }) => {
    const dto = new LogoutUserDTO({
      userId: 1,
      ipAddress: '10.0.0.1',
    })
    assert.isUndefined(dto.sessionId)
  })

  test('constructs with sessionId', ({ assert }) => {
    const dto = new LogoutUserDTO({
      userId: 1,
      sessionId: 'session-abc-123',
      ipAddress: '127.0.0.1',
    })
    assert.equal(dto.sessionId, 'session-abc-123')
  })

  test('toObject returns plain data', ({ assert }) => {
    const dto = new LogoutUserDTO({
      userId: 42,
      sessionId: 'sess-1',
      ipAddress: '10.0.0.1',
    })
    const obj = dto.toObject()
    assert.deepEqual(obj, {
      userId: 42,
      sessionId: 'sess-1',
      ipAddress: '10.0.0.1',
    })
  })

  test('toObject without sessionId', ({ assert }) => {
    const dto = new LogoutUserDTO({
      userId: 1,
      ipAddress: '10.0.0.1',
    })
    const obj = dto.toObject()
    assert.equal(obj.userId, 1)
    assert.equal(obj.ipAddress, '10.0.0.1')
    assert.isUndefined(obj.sessionId)
  })
})

// ============================================================================
// Validation — userId
// ============================================================================

test.group('LogoutUserDTO | userId validation', () => {
  test('throws ValidationException for userId = 0', ({ assert }) => {
    assert.throws(() => {
      new LogoutUserDTO({ userId: 0, ipAddress: '10.0.0.1' })
    }, 'User ID is required')
  })

  test('throws ValidationException for negative userId', ({ assert }) => {
    assert.throws(() => {
      new LogoutUserDTO({ userId: -1, ipAddress: '10.0.0.1' })
    }, 'User ID is required')
  })

  test('thrown error is instance of ValidationException', ({ assert }) => {
    try {
      new LogoutUserDTO({ userId: 0, ipAddress: '10.0.0.1' })
      assert.fail('Expected ValidationException')
    } catch (err) {
      assert.instanceOf(err, ValidationException)
    }
  })

  test('thrown error has status 422', ({ assert }) => {
    try {
      new LogoutUserDTO({ userId: 0, ipAddress: '10.0.0.1' })
      assert.fail('Expected ValidationException')
    } catch (err) {
      assert.equal((err as ValidationException).status, 422)
    }
  })
})

// ============================================================================
// Validation — ipAddress
// ============================================================================

test.group('LogoutUserDTO | ipAddress validation', () => {
  test('throws ValidationException for empty ipAddress', ({ assert }) => {
    assert.throws(() => {
      new LogoutUserDTO({ userId: 1, ipAddress: '' })
    }, 'IP address is required')
  })

  test('thrown error is instance of ValidationException', ({ assert }) => {
    try {
      new LogoutUserDTO({ userId: 1, ipAddress: '' })
      assert.fail('Expected ValidationException')
    } catch (err) {
      assert.instanceOf(err, ValidationException)
    }
  })
})
