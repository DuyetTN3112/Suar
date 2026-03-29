import { test } from '@japa/runner'
import NotFoundException from '#exceptions/not_found_exception'
import ValidationException from '#exceptions/validation_exception'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ConflictException from '#exceptions/conflict_exception'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import RateLimitException from '#exceptions/rate_limit_exception'

test.group('Exception contracts', () => {
  test('constructors and not-found factories expose canonical HTTP status contracts', ({
    assert,
  }) => {
    const cases = [
      { error: new NotFoundException(), status: 404, messageParts: ['Không tìm thấy'] },
      {
        error: new ValidationException('Invalid input'),
        status: 422,
        messageParts: ['Invalid input'],
      },
      { error: new ForbiddenException(), status: 403, messageParts: ['quyền'] },
      { error: new BusinessLogicException(), status: 400, messageParts: [] },
      { error: new ConflictException(), status: 409, messageParts: [] },
      { error: new UnauthorizedException(), status: 401, messageParts: ['đăng nhập'] },
      { error: new RateLimitException(), status: 429, messageParts: [] },
    ]

    for (const entry of cases) {
      assert.equal(entry.error.status, entry.status)
      for (const messagePart of entry.messageParts) {
        assert.include(entry.error.message, messagePart)
      }
    }

    const resource = NotFoundException.resource('Dự án', 123)
    const user = NotFoundException.user('abc-123')
    const organization = NotFoundException.organization()
    const task = NotFoundException.task()

    assert.include(resource.message, 'Dự án')
    assert.include(resource.message, '123')
    assert.include(user.message, 'abc-123')
    assert.include(organization.message, 'tổ chức')
    assert.include(task.message, 'công việc')
  })

  test('validation and denial factories preserve actionable context for callers', ({ assert }) => {
    const singleField = ValidationException.field('email', 'Email không hợp lệ')
    const multipleFields = ValidationException.fields({
      name: 'Required',
      email: 'Invalid',
    })

    assert.deepEqual(singleField.errors, { email: 'Email không hợp lệ' })
    assert.equal(singleField.message, 'Email không hợp lệ')
    assert.equal(multipleFields.message, '2 lỗi validation')
    assert.deepEqual(multipleFields.errors, {
      name: 'Required',
      email: 'Invalid',
    })
    const forbiddenAction = ForbiddenException.action('xóa thành viên')
    const ownerOrAdmin = ForbiddenException.onlyOwnerOrAdmin('xóa dự án')
    const superAdmin = ForbiddenException.onlySuperAdmin()
    const selfAction = BusinessLogicException.cannotSelfAction('thay đổi vai trò')
    const noChanges = BusinessLogicException.noChanges()
    const memberMissing = BusinessLogicException.memberNotInOrganization()

    assert.include(forbiddenAction.message, 'xóa thành viên')
    assert.include(ownerOrAdmin.message, 'owner')
    assert.include(ownerOrAdmin.message, 'admin')
    assert.include(superAdmin.message, 'superadmin')
    assert.include(selfAction.message, 'chính mình')
    assert.include(noChanges.message, 'thay đổi')
    assert.include(memberMissing.message, 'tổ chức')
  })

  test('conflict, unauthorized, and rate-limit factories preserve recovery semantics', ({
    assert,
  }) => {
    const duplicate = ConflictException.duplicate('User', 'email')
    const alreadyExists = ConflictException.alreadyExists('Bạn đã ứng tuyển')
    const loginRequired = new UnauthorizedException()
    const sessionExpired = UnauthorizedException.sessionExpired()
    const explicitRetry = new RateLimitException('Too many requests', 60)
    const factoryRetry = RateLimitException.withRetry(30)

    assert.include(duplicate.message, 'User')
    assert.include(duplicate.message, 'email')
    assert.equal(alreadyExists.message, 'Bạn đã ứng tuyển')
    assert.include(loginRequired.message, 'đăng nhập')
    assert.include(sessionExpired.message, 'hết hạn')
    assert.equal(explicitRetry.retryAfter, 60)
    assert.equal(factoryRetry.retryAfter, 30)
    assert.include(factoryRetry.message, '30')
  })
})
