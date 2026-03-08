import { test } from '@japa/runner'
import NotFoundException from '#exceptions/not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ConflictException from '#exceptions/conflict_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import RateLimitException from '#exceptions/rate_limit_exception'

test.group('NotFoundException', () => {
  test('default message and status', ({ assert }) => {
    const err = new NotFoundException()
    assert.equal(err.status, 404)
    assert.include(err.message, 'Không tìm thấy')
  })

  test('custom message', ({ assert }) => {
    const err = new NotFoundException('Custom not found')
    assert.equal(err.message, 'Custom not found')
    assert.equal(err.status, 404)
  })

  test('resource() factory without id', ({ assert }) => {
    const err = NotFoundException.resource('Dự án')
    assert.equal(err.message, 'Dự án không tồn tại')
    assert.equal(err.status, 404)
  })

  test('resource() factory with id', ({ assert }) => {
    const err = NotFoundException.resource('Dự án', 123)
    assert.include(err.message, 'Dự án')
    assert.include(err.message, '123')
  })

  test('user() factory', ({ assert }) => {
    const err = NotFoundException.user()
    assert.include(err.message, 'người dùng')
    assert.equal(err.status, 404)
  })

  test('user() factory with id', ({ assert }) => {
    const err = NotFoundException.user('abc-123')
    assert.include(err.message, 'abc-123')
  })

  test('organization() factory', ({ assert }) => {
    const err = NotFoundException.organization()
    assert.include(err.message, 'tổ chức')
  })

  test('task() factory', ({ assert }) => {
    const err = NotFoundException.task()
    assert.include(err.message, 'công việc')
  })

  test('conversation() factory', ({ assert }) => {
    const err = NotFoundException.conversation()
    assert.include(err.message, 'cuộc trò chuyện')
  })
})

test.group('ValidationException', () => {
  test('default properties', ({ assert }) => {
    const err = new ValidationException('Invalid input')
    assert.equal(err.status, 422)
    assert.equal(err.message, 'Invalid input')
    assert.deepEqual(err.errors, {})
  })

  test('with errors record', ({ assert }) => {
    const errors = { email: 'Invalid', name: 'Required' }
    const err = new ValidationException('Validation failed', errors)
    assert.deepEqual(err.errors, errors)
  })

  test('field() factory', ({ assert }) => {
    const err = ValidationException.field('email', 'Email không hợp lệ')
    assert.equal(err.message, 'Email không hợp lệ')
    assert.deepEqual(err.errors, { email: 'Email không hợp lệ' })
  })

  test('fields() factory with single field', ({ assert }) => {
    const err = ValidationException.fields({ name: 'Tên là bắt buộc' })
    assert.equal(err.message, 'Tên là bắt buộc')
    assert.deepEqual(err.errors, { name: 'Tên là bắt buộc' })
  })

  test('fields() factory with multiple fields', ({ assert }) => {
    const err = ValidationException.fields({
      name: 'Required',
      email: 'Invalid',
    })
    assert.include(err.message, '2 lỗi validation')
    assert.equal(Object.keys(err.errors).length, 2)
  })
})

test.group('ForbiddenException', () => {
  test('default message and status', ({ assert }) => {
    const err = new ForbiddenException()
    assert.equal(err.status, 403)
    assert.isString(err.message)
  })

  test('action() factory', ({ assert }) => {
    const err = ForbiddenException.action('xóa thành viên')
    assert.include(err.message, 'xóa thành viên')
    assert.equal(err.status, 403)
  })

  test('onlyRole() factory', ({ assert }) => {
    const err = ForbiddenException.onlyRole('admin')
    assert.include(err.message, 'admin')
  })

  test('onlyOwnerOrAdmin() factory without action', ({ assert }) => {
    const err = ForbiddenException.onlyOwnerOrAdmin()
    assert.include(err.message, 'owner')
    assert.include(err.message, 'admin')
  })

  test('onlyOwnerOrAdmin() factory with action', ({ assert }) => {
    const err = ForbiddenException.onlyOwnerOrAdmin('xóa dự án')
    assert.include(err.message, 'xóa dự án')
  })

  test('onlySuperAdmin() factory', ({ assert }) => {
    const err = ForbiddenException.onlySuperAdmin()
    assert.include(err.message, 'superadmin')
  })
})

test.group('BusinessLogicException', () => {
  test('default status is 400', ({ assert }) => {
    const err = new BusinessLogicException()
    assert.equal(err.status, 400)
  })

  test('custom message', ({ assert }) => {
    const err = new BusinessLogicException('Cannot do that')
    assert.equal(err.message, 'Cannot do that')
  })

  test('cannotSelfAction() factory', ({ assert }) => {
    const err = BusinessLogicException.cannotSelfAction('thay đổi vai trò')
    assert.include(err.message, 'thay đổi vai trò')
    assert.include(err.message, 'chính mình')
  })

  test('invalidState() factory', ({ assert }) => {
    const err = BusinessLogicException.invalidState('Yêu cầu đã được xử lý')
    assert.equal(err.message, 'Yêu cầu đã được xử lý')
  })

  test('noChanges() factory', ({ assert }) => {
    const err = BusinessLogicException.noChanges()
    assert.include(err.message, 'thay đổi')
  })

  test('memberNotInOrganization() factory', ({ assert }) => {
    const err = BusinessLogicException.memberNotInOrganization()
    assert.include(err.message, 'tổ chức')
  })
})

test.group('ConflictException', () => {
  test('default status is 409', ({ assert }) => {
    const err = new ConflictException()
    assert.equal(err.status, 409)
  })

  test('duplicate() factory without field', ({ assert }) => {
    const err = ConflictException.duplicate('User')
    assert.include(err.message, 'User')
    assert.include(err.message, 'đã tồn tại')
  })

  test('duplicate() factory with field', ({ assert }) => {
    const err = ConflictException.duplicate('User', 'email')
    assert.include(err.message, 'User')
    assert.include(err.message, 'email')
  })

  test('alreadyExists() factory', ({ assert }) => {
    const err = ConflictException.alreadyExists('Bạn đã ứng tuyển')
    assert.equal(err.message, 'Bạn đã ứng tuyển')
  })
})

test.group('UnauthorizedException', () => {
  test('default status is 401', ({ assert }) => {
    const err = new UnauthorizedException()
    assert.equal(err.status, 401)
    assert.include(err.message, 'đăng nhập')
  })

  test('sessionExpired() factory', ({ assert }) => {
    const err = UnauthorizedException.sessionExpired()
    assert.include(err.message, 'hết hạn')
  })
})

test.group('RateLimitException', () => {
  test('default status is 429', ({ assert }) => {
    const err = new RateLimitException()
    assert.equal(err.status, 429)
    assert.isUndefined(err.retryAfter)
  })

  test('with retryAfter', ({ assert }) => {
    const err = new RateLimitException('Too many requests', 60)
    assert.equal(err.retryAfter, 60)
  })

  test('withRetry() factory', ({ assert }) => {
    const err = RateLimitException.withRetry(30)
    assert.equal(err.retryAfter, 30)
    assert.include(err.message, '30')
  })
})
