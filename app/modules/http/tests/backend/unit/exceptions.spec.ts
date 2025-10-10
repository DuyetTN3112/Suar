import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import HttpExceptionHandler from '#modules/http/exceptions/handler'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import RateLimitException from '#modules/http/exceptions/rate_limit_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import ValidationException from '#modules/http/exceptions/validation_exception'

function toHttpContext(
  value: unknown
): HttpContext {
  return value as HttpContext
}

interface ResponseState {
  statusCode: number
  headers: Record<string, string>
  payload: unknown
}

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
    const alreadyExists = ConflictException.alreadyExists('Bạn đã gửi đề xuất')
    const loginRequired = new UnauthorizedException()
    const sessionExpired = UnauthorizedException.sessionExpired()
    const explicitRetry = new RateLimitException('Too many requests', 60)
    const factoryRetry = RateLimitException.withRetry(30)

    assert.include(duplicate.message, 'User')
    assert.include(duplicate.message, 'email')
    assert.equal(alreadyExists.message, 'Bạn đã gửi đề xuất')
    assert.include(loginRequired.message, 'đăng nhập')
    assert.include(sessionExpired.message, 'hết hạn')
    assert.equal(explicitRetry.retryAfter, 60)
    assert.equal(factoryRetry.retryAfter, 30)
    assert.include(factoryRetry.message, '30')
  })

  test('handler emits Problem Details for canonical API validation errors', async ({
    assert,
  }) => {
    const handler = new HttpExceptionHandler()
    const responseState: ResponseState = {
      statusCode: 200,
      headers: {},
      payload: null,
    }

    const ctx = {
      httpTransportKind: 'api-canonical',
      request: {
        url: () => '/api/v1/me',
        header: () => null,
        accepts: () => 'json',
      },
      response: {
        status(code: number) {
          responseState.statusCode = code
          return this
        },
        header(name: string, value: string) {
          responseState.headers[name.toLowerCase()] = value
          return this
        },
        json(payload: unknown) {
          responseState.payload = payload
          return this
        },
      },
      session: {
        flash() {},
        put() {},
      },
      inertia: {
        location() {},
      },
      requestContext: {
        requestId: 'req_v1',
        correlationId: 'corr_v1',
      },
    }

    await handler.handle(
      ValidationException.field('email', 'Email invalid'),
      toHttpContext(ctx)
    )

    assert.equal(responseState.statusCode, 422)
    assert.equal(
      responseState.headers['content-type'],
      'application/problem+json'
    )
    assert.deepEqual(responseState.payload, {
      type: 'https://docs.suar.dev/problems/validation',
      title: 'Validation error',
      status: 422,
      detail: 'Email invalid',
      code: 'E_VALIDATION',
      requestId: 'req_v1',
      correlationId: 'corr_v1',
      errors: {
        email: 'Email invalid',
      },
    })
  })

  test('handler emits compatibility error envelope for legacy API validation errors', async ({
    assert,
  }) => {
    const handler = new HttpExceptionHandler()
    const responseState: ResponseState = {
      statusCode: 200,
      headers: {},
      payload: null,
    }

    const ctx = {
      request: {
        url: () => '/api/tasks/123',
        header: () => null,
        accepts: () => 'json',
      },
      response: {
        status(code: number) {
          responseState.statusCode = code
          return this
        },
        header(name: string, value: string) {
          responseState.headers[name.toLowerCase()] = value
          return this
        },
        json(payload: unknown) {
          responseState.payload = payload
          return this
        },
      },
      session: {
        flash() {},
        put() {},
      },
      inertia: {
        location() {},
      },
      requestContext: {
        requestId: 'req_legacy',
        correlationId: 'corr_legacy',
      },
    }

    await handler.handle(
      ValidationException.field('email', 'Email invalid'),
      toHttpContext(ctx)
    )

    assert.equal(responseState.statusCode, 422)
    assert.deepEqual(responseState.headers, {})
    assert.deepEqual(responseState.payload, {
      success: false,
      error: {
        code: 'E_VALIDATION',
        message: 'Email invalid',
        errors: {
          email: 'Email invalid',
        },
      },
      meta: {
        request_id: 'req_legacy',
        correlation_id: 'corr_legacy',
      },
    })
  })
})
