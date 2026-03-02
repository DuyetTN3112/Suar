import { test } from '@japa/runner'

import AppException from '#modules/errors/public_contracts/application_exception'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { publicErrorMessage } from '#modules/errors/public_contracts/public_error_message'

test.group('Organization bulk failure message', () => {
  test('preserves the safe message of a trusted actionable exception', ({ assert }) => {
    const error = new BusinessLogicException('Người dùng không thể được thêm vào tổ chức này')

    assert.equal(publicErrorMessage(error), error.safeMessage)
  })

  test('uses the safe message rather than diagnostics for an internal AppException', ({
    assert,
  }) => {
    const error = new AppException('password=secret database connection failed')

    assert.equal(publicErrorMessage(error), ErrorMessages.INTERNAL_ERROR)
    assert.notInclude(publicErrorMessage(error), 'password=secret')
  })

  test('does not expose a generic exception message', ({ assert }) => {
    const error = new Error('duplicate key violates users_email_unique; email=secret@example.com')

    assert.equal(publicErrorMessage(error), ErrorMessages.GENERIC_ERROR)
    assert.notInclude(publicErrorMessage(error), 'secret@example.com')
  })
})
