import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'
import vine from '@vinejs/vine'

import AppException from '#modules/errors/public_contracts/application_exception'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { HttpErrorEventReporter } from '#modules/http/actions/ports/outbound/http_error_event_reporter'
import HttpExceptionHandler from '#modules/http/exceptions/handler'
import RateLimitException from '#modules/http/exceptions/rate_limit_exception'

class NoopHttpErrorEventReporter extends HttpErrorEventReporter {
  override enqueue(): void {}
}

function makeExceptionHandler(): HttpExceptionHandler {
  return new HttpExceptionHandler(new NoopHttpErrorEventReporter())
}

function toHttpContext(value: unknown): HttpContext {
  return value as HttpContext
}

interface ResponseState {
  statusCode: number
  headers: Record<string, string>
  payload: unknown
}

function createCanonicalApiContext(
  path: string = '/api/v1/test',
  requestOptions: {
    method?: string
    idempotencyKey?: string
  } = {}
): {
  ctx: HttpContext
  responseState: ResponseState
} {
  const responseState: ResponseState = {
    statusCode: 200,
    headers: {},
    payload: null,
  }
  const ctx = {
    httpTransportKind: 'api-canonical',
    request: {
      url: () => path,
      method: () => requestOptions.method ?? 'GET',
      ip: () => '127.0.0.1',
      header: (name: string) =>
        name.toLowerCase() === 'idempotency-key'
          ? (requestOptions.idempotencyKey ?? null)
          : null,
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
      get() {
        return null
      },
    },
    auth: {
      user: null,
    },
    inertia: {
      location() {},
    },
    requestContext: {
      requestId: 'req_test',
      correlationId: 'corr_test',
    },
  }

  return { ctx: toHttpContext(ctx), responseState }
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
      {
        error: new InvariantViolationException('sensitive persistence state'),
        status: 500,
        messageParts: ['sensitive persistence state'],
      },
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

  test('invariant violations keep diagnostics server-side and expose only a safe 500', async ({
    assert,
  }) => {
    const handler = makeExceptionHandler()
    const { ctx, responseState } = createCanonicalApiContext()

    await handler.handle(
      new InvariantViolationException('database record contains secret-state'),
      ctx
    )

    const body = responseState.payload as Record<string, unknown>
    assert.equal(responseState.statusCode, 500)
    assert.equal(body['code'], 'E_INVARIANT_VIOLATION')
    assert.notInclude(JSON.stringify(body), 'secret-state')
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
    assert.isTrue(explicitRetry.retryable)
    assert.isFalse(explicitRetry.shouldReport)
    assert.equal(factoryRetry.retryAfter, 30)
    assert.include(factoryRetry.message, '30')
  })

  test('handler emits Problem Details for canonical API validation errors', async ({ assert }) => {
    const handler = makeExceptionHandler()
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

    await handler.handle(ValidationException.field('email', 'Email invalid'), toHttpContext(ctx))

    assert.equal(responseState.statusCode, 422)
    assert.equal(responseState.headers['content-type'], 'application/problem+json')
    assert.deepEqual(responseState.payload, {
      type: 'https://docs.suar.dev/problems/validation',
      title: 'Validation error',
      status: 422,
      detail: 'Email invalid',
      instance: 'urn:suar:problem:req_v1',
      code: 'E_VALIDATION',
      category: 'validation',
      retryable: false,
      requestId: 'req_v1',
      correlationId: 'corr_v1',
      errors: {
        email: 'Email invalid',
      },
      violations: [
        {
          field: 'email',
          pointer: '/email',
          message: 'Email invalid',
          code: 'E_VALIDATION',
        },
      ],
    })
  })

  test('handler emits compatibility error envelope for legacy API validation errors', async ({
    assert,
  }) => {
    const handler = makeExceptionHandler()
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

    await handler.handle(ValidationException.field('email', 'Email invalid'), toHttpContext(ctx))

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

  test('handler recognizes Vine validation errors without trusting status-shaped objects', async ({
    assert,
  }) => {
    const handler = makeExceptionHandler()
    const { ctx, responseState } = createCanonicalApiContext()
    const validator = vine.create(
      vine.object({
        action: vine.enum(['approve', 'reject']),
      })
    )

    let validationError: unknown
    try {
      await validator.validate({ action: 'archive' })
    } catch (error) {
      validationError = error
    }

    await handler.handle(validationError, ctx)

    assert.equal(responseState.statusCode, 422)
    assert.deepInclude(responseState.payload, {
      title: 'Validation error',
      status: 422,
      code: 'E_VALIDATION',
      errors: {
        action: 'The selected action is invalid',
      },
    })
  })

  test('handler does not trust plain objects that claim an HTTP status', async ({ assert }) => {
    const handler = makeExceptionHandler()
    const { ctx, responseState } = createCanonicalApiContext()

    await handler.handle(
      {
        status: 422,
        code: 'E_VALIDATION_ERROR',
        message: 'sensitive internal resource name',
        messages: [{ field: 'secret', message: 'must not escape' }],
      },
      ctx
    )

    assert.equal(responseState.statusCode, 500)
    assert.deepInclude(responseState.payload, {
      title: 'Internal server error',
      status: 500,
      detail: 'Đã xảy ra lỗi hệ thống',
      code: 'E_INTERNAL_ERROR',
    })
    assert.notInclude(JSON.stringify(responseState.payload), 'sensitive internal resource name')
  })

  test('handler accepts bounded framework statuses and emits safe infrastructure details', async ({
    assert,
  }) => {
    const handler = makeExceptionHandler()
    const cases = [
      {
        status: 405,
        expectedCode: 'E_METHOD_NOT_ALLOWED',
        expectedTitle: 'Method not allowed',
        expectedDetail: 'Phương thức HTTP không được hỗ trợ cho tài nguyên này',
      },
      {
        status: 408,
        expectedCode: 'E_REQUEST_TIMEOUT',
        expectedTitle: 'Request timeout',
        expectedDetail: 'Yêu cầu mất quá nhiều thời gian để hoàn tất',
      },
      {
        status: 413,
        expectedCode: 'E_PAYLOAD_TOO_LARGE',
        expectedTitle: 'Payload too large',
        expectedDetail: 'Dữ liệu gửi lên vượt quá giới hạn cho phép',
      },
      {
        status: 415,
        expectedCode: 'E_UNSUPPORTED_MEDIA_TYPE',
        expectedTitle: 'Unsupported media type',
        expectedDetail: 'Định dạng dữ liệu gửi lên không được hỗ trợ',
      },
      {
        status: 419,
        expectedCode: 'E_CSRF_EXPIRED',
        expectedTitle: 'Page expired',
        expectedDetail: 'Trang đã hết hạn, vui lòng thử lại',
      },
      {
        status: 502,
        expectedCode: 'E_BAD_GATEWAY',
        expectedTitle: 'Bad gateway',
        expectedDetail: 'Dịch vụ phụ thuộc trả về phản hồi không hợp lệ',
      },
      {
        status: 503,
        expectedCode: 'E_SERVICE_UNAVAILABLE',
        expectedTitle: 'Service unavailable',
        expectedDetail: 'Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau',
      },
      {
        status: 504,
        expectedCode: 'E_GATEWAY_TIMEOUT',
        expectedTitle: 'Gateway timeout',
        expectedDetail: 'Dịch vụ phụ thuộc phản hồi quá chậm, vui lòng thử lại sau',
      },
    ]

    for (const entry of cases) {
      const { ctx, responseState } = createCanonicalApiContext()
      await handler.handle(
        new Exception('database host=db.internal password=secret', { status: entry.status }),
        ctx
      )

      assert.deepInclude(responseState.payload, {
        status: entry.status,
        code: entry.expectedCode,
        title: entry.expectedTitle,
        detail: entry.expectedDetail,
      })
      assert.notInclude(JSON.stringify(responseState.payload), 'db.internal')
      assert.notInclude(JSON.stringify(responseState.payload), 'password=secret')
    }
  })

  test('handler never exposes raw framework messages for generic client failures', async ({
    assert,
  }) => {
    const handler = makeExceptionHandler()
    const { ctx, responseState } = createCanonicalApiContext()

    await handler.handle(new Exception('tenant=private-org token=secret', { status: 400 }), ctx)

    assert.deepInclude(responseState.payload, {
      status: 400,
      code: 'E_BUSINESS_LOGIC',
      category: 'business',
      retryable: false,
      detail: 'Dữ liệu đầu vào không hợp lệ',
    })
    assert.notInclude(JSON.stringify(responseState.payload), 'private-org')
    assert.notInclude(JSON.stringify(responseState.payload), 'secret')
  })

  test('handler rejects out-of-range framework statuses as internal errors', async ({ assert }) => {
    const handler = makeExceptionHandler()
    const { ctx, responseState } = createCanonicalApiContext()

    await handler.handle(new Exception('invalid status', { status: 700 }), ctx)

    assert.equal(responseState.statusCode, 500)
    assert.deepInclude(responseState.payload, {
      status: 500,
      code: 'E_INTERNAL_ERROR',
    })
  })

  test('handler maps PostgreSQL SQLSTATEs without leaking constraint diagnostics', async ({
    assert,
  }) => {
    const handler = makeExceptionHandler()
    const conflictContext = createCanonicalApiContext()
    const deadlockContext = createCanonicalApiContext()
    const unavailableContext = createCanonicalApiContext()

    await handler.handle(
      Object.assign(new Error('duplicate key users_email_key=(private@example.com)'), {
        code: '23505',
      }),
      conflictContext.ctx
    )
    await handler.handle(
      Object.assign(new Error('deadlock process details'), { code: '40P01' }),
      deadlockContext.ctx
    )
    await handler.handle(
      Object.assign(new Error('connection failed host=db.internal password=secret'), {
        code: '08006',
      }),
      unavailableContext.ctx
    )

    assert.deepInclude(conflictContext.responseState.payload, {
      status: 409,
      code: 'E_DATABASE_UNIQUE_CONFLICT',
      detail: 'Dữ liệu bị trùng lặp',
    })
    assert.notInclude(JSON.stringify(conflictContext.responseState.payload), 'users_email_key')
    assert.deepInclude(deadlockContext.responseState.payload, {
      status: 503,
      code: 'E_DATABASE_DEADLOCK',
      category: 'dependency',
      retryable: true,
      detail: 'Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau',
    })
    assert.notInclude(JSON.stringify(deadlockContext.responseState.payload), 'deadlock process')
    assert.deepInclude(unavailableContext.responseState.payload, {
      status: 503,
      code: 'E_DATABASE_UNAVAILABLE',
      category: 'dependency',
      retryable: true,
      detail: 'Dịch vụ tạm thời không khả dụng, vui lòng thử lại sau',
    })
    assert.notInclude(JSON.stringify(unavailableContext.responseState.payload), 'db.internal')
    assert.notInclude(JSON.stringify(unavailableContext.responseState.payload), 'secret')
  })

  test('handler only recommends retry for safe or explicitly idempotent requests', async ({
    assert,
  }) => {
    const handler = makeExceptionHandler()
    const unsafeMutation = createCanonicalApiContext('/api/v1/tasks', {
      method: 'POST',
    })
    const idempotentMutation = createCanonicalApiContext('/api/v1/tasks', {
      method: 'POST',
      idempotencyKey: 'stable-operation-key',
    })

    await handler.handle(
      Object.assign(new Error('connection unavailable'), { code: '08006' }),
      unsafeMutation.ctx
    )
    await handler.handle(
      Object.assign(new Error('connection unavailable'), { code: '08006' }),
      idempotentMutation.ctx
    )

    assert.deepInclude(unsafeMutation.responseState.payload, {
      status: 503,
      code: 'E_DATABASE_UNAVAILABLE',
      retryable: false,
    })
    assert.deepInclude(idempotentMutation.responseState.payload, {
      status: 503,
      code: 'E_DATABASE_UNAVAILABLE',
      retryable: true,
    })
  })

  test('only validation exceptions may emit field violations', async ({ assert }) => {
    const handler = makeExceptionHandler()
    const { ctx, responseState } = createCanonicalApiContext()
    const malformedBusinessError = new AppException('Business failure', {
      status: 400,
      code: 'E_BUSINESS_LOGIC',
      errors: { hidden: 'must not force a validation response' },
    })

    await handler.handle(malformedBusinessError, ctx)

    assert.equal(responseState.statusCode, 400)
    assert.deepInclude(responseState.payload, {
      status: 400,
      code: 'E_BUSINESS_LOGIC',
      detail: 'Business failure',
    })
    assert.notProperty(responseState.payload, 'errors')
    assert.notProperty(responseState.payload, 'violations')
  })

  test('reporter tolerates a context created before auth, session, and request context', async ({
    assert,
  }) => {
    const handler = makeExceptionHandler()
    const error = new AppException('internal diagnostic token=secret', {
      shouldReport: false,
    })

    await handler.report(error, toHttpContext({}))

    assert.isTrue(true)
  })

  test('reporter never propagates a recursive failure from a hostile thrown object', async ({
    assert,
  }) => {
    const handler = makeExceptionHandler()
    const hostileError = new Proxy(new Error('original failure'), {
      get() {
        throw new Error('recursive reporting failure')
      },
    })

    await handler.report(hostileError, toHttpContext({}))

    assert.isTrue(true)
  })
})
