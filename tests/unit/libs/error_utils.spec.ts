import { Exception } from '@adonisjs/core/exceptions'
import { test } from '@japa/runner'

import {
  AppError,
  isError,
  isAppError,
  getErrorMessage,
  getErrorCode,
  getErrorStatusCode,
  handleApiControllerError,
  handleControllerError,
  serializeError,
  withErrorHandling,
} from '#libs/error_utils'

test.group('Error utils', () => {
  test('AppError preserves canonical metadata and factory helper contracts', ({ assert }) => {
    const cause = new Error('root cause')
    const defaultError = new AppError('Default error')
    const customError = new AppError('Custom error', {
      code: 'CUSTOM',
      statusCode: 400,
      isOperational: false,
      metadata: { field: 'email' },
      cause,
    })

    assert.equal(defaultError.name, 'AppError')
    assert.equal(defaultError.code, 'UNKNOWN_ERROR')
    assert.equal(defaultError.statusCode, 500)
    assert.isTrue(defaultError.isOperational)

    assert.equal(customError.code, 'CUSTOM')
    assert.equal(customError.statusCode, 400)
    assert.isFalse(customError.isOperational)
    assert.deepEqual(customError.metadata, { field: 'email' })
    assert.equal(customError.cause, cause)

    const factories = [
      {
        error: AppError.notFound('Dự án', 123),
        code: 'NOT_FOUND',
        statusCode: 404,
        messageParts: ['Dự án', '123'],
      },
      {
        error: AppError.forbidden(),
        code: 'FORBIDDEN',
        statusCode: 403,
        messageParts: ['quyền'],
      },
      {
        error: AppError.unauthorized(),
        code: 'UNAUTHORIZED',
        statusCode: 401,
        messageParts: ['đăng nhập'],
      },
      {
        error: AppError.conflict('User', 'email'),
        code: 'CONFLICT',
        statusCode: 409,
        messageParts: ['User', 'email'],
      },
      {
        error: AppError.internal(),
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        messageParts: ['lỗi hệ thống'],
      },
    ]

    for (const factory of factories) {
      assert.instanceOf(factory.error, AppError)
      assert.equal(factory.error.code, factory.code)
      assert.equal(factory.error.statusCode, factory.statusCode)
      for (const messagePart of factory.messageParts) {
        assert.include(factory.error.message, messagePart)
      }
    }

    const validationWithField = AppError.validation('Email invalid', 'email')
    const validationWithoutField = AppError.validation('Some error')

    assert.equal(validationWithField.code, 'VALIDATION_ERROR')
    assert.deepEqual(validationWithField.metadata, { field: 'email' })
    assert.isUndefined(validationWithoutField.metadata)
    assert.isFalse(AppError.internal().isOperational)
  })

  test('guards and extractors normalize thrown values without over-classifying them', ({
    assert,
  }) => {
    const appError = new AppError('app error', { code: 'APP_ERR', statusCode: 418 })

    assert.isTrue(isError(new Error('plain error')))
    assert.isTrue(isError(appError))
    assert.isTrue(isAppError(appError))
    assert.isFalse(isAppError(new Error('plain error')))
    assert.isFalse(isError('not an error'))
    assert.isFalse(isAppError({ message: 'test', code: 'ERR' }))

    assert.equal(getErrorMessage(appError), 'app error')
    assert.equal(getErrorMessage('string error'), 'string error')
    assert.equal(getErrorMessage({ message: 'object error' }), 'object error')
    assert.equal(getErrorMessage(42, 'fallback'), 'fallback')

    assert.equal(getErrorCode(appError), 'APP_ERR')
    assert.equal(getErrorCode({ code: 'ERR_CODE' }), 'ERR_CODE')
    assert.isUndefined(getErrorCode(new Error('plain error')))

    assert.equal(getErrorStatusCode(appError), 418)
    assert.equal(getErrorStatusCode({ statusCode: 422 }), 422)
    assert.equal(getErrorStatusCode({ status: 403 }), 403)
    assert.equal(getErrorStatusCode(null, 404), 404)
  })

  test('withErrorHandling and serializeError preserve safe success and failure surfaces', async ({
    assert,
  }) => {
    const success = await withErrorHandling(
      () => Promise.resolve('ok'),
      () => 'should not be used'
    )

    const fromAppError = await withErrorHandling(
      async () => Promise.reject(AppError.forbidden('blocked')),
      (error, message) => ({
        isAppError: isAppError(error),
        message,
      })
    )

    const fromRegularError = await withErrorHandling(
      () => Promise.reject(new Error('plain failure')),
      (_error, message) => message
    )

    assert.equal(success, 'ok')
    assert.deepEqual(fromAppError, {
      isAppError: true,
      message: 'blocked',
    })
    assert.equal(fromRegularError, 'plain failure')

    const appError = new AppError('Serialized app error', { code: 'SERIALIZED' })
    const serializedAppError = serializeError(appError)
    const serializedError = serializeError(new Error('Regular error'), true)
    const serializedUnknown = serializeError(42)

    assert.deepEqual(serializedAppError, {
      error: 'Serialized app error',
      code: 'SERIALIZED',
    })
    assert.equal(serializedError.error, 'Regular error')
    assert.isString(serializedError.details)
    assert.deepEqual(serializedUnknown, {
      error: 'Có lỗi xảy ra',
    })
  })

  test('controller helpers keep framework exceptions intact and normalize generic errors', ({
    assert,
  }) => {
    const flashed: { key: string; value: string }[] = []
    const responseState = {
      redirectedBack: false,
      statusCode: 200,
      payload: null as Record<string, unknown> | null,
    }

    const ctx = {
      session: {
        flash(key: string, value: string) {
          flashed.push({ key, value })
        },
      },
      response: {
        redirect() {
          return {
            back() {
              responseState.redirectedBack = true
            },
          }
        },
        status(code: number) {
          responseState.statusCode = code
          return this
        },
        json(payload: Record<string, unknown>) {
          responseState.payload = payload
        },
      },
    }

    const frameworkError = new Exception('framework failure', { status: 409 })
    assert.throws(() => {
      handleControllerError(frameworkError, ctx as never, 'TasksController.store')
    })
    assert.throws(() =>
      handleApiControllerError(frameworkError, ctx as never, 'TasksApiController.show')
    )

    handleControllerError(new Error('plain failure'), ctx as never, 'TasksController.store')
    assert.deepEqual(flashed, [{ key: 'error', value: 'plain failure' }])
    assert.isTrue(responseState.redirectedBack)

    const apiError = handleApiControllerError(
      new AppError('api failure', { code: 'API_FAILURE', statusCode: 422 }),
      ctx as never,
      'TasksApiController.show'
    )

    assert.equal(responseState.statusCode, 422)
    assert.deepEqual(apiError, {
      success: false,
      error: {
        code: 'API_FAILURE',
        message: 'api failure',
      },
    })
    assert.deepEqual(responseState.payload, apiError)
  })
})
