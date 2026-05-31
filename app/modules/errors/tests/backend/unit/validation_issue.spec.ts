import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  flattenValidationIssues,
  validationIssue,
  validationIssuesFromRecord,
} from '#modules/errors/public_contracts/validation_issue'

test.group('Validation issue contract', () => {
  test('preserves stable code and indexed field path', ({ assert }) => {
    const issue = validationIssue(
      'incompleteTasks.0.destination',
      'Destination is required',
      'SPRINT_DESTINATION_REQUIRED'
    )

    assert.deepEqual(issue, {
      code: 'SPRINT_DESTINATION_REQUIRED',
      path: 'incompleteTasks.0.destination',
      message: 'Destination is required',
    })
  })

  test('keeps the first message when flattening duplicate paths', ({ assert }) => {
    const issues = [
      validationIssue('name', 'Name is required', 'NAME_REQUIRED'),
      validationIssue('name', 'Name is too short', 'NAME_TOO_SHORT'),
    ]

    assert.deepEqual(flattenValidationIssues(issues), {
      name: 'Name is required',
    })
  })

  test('creates a canonical issue list from legacy field errors', ({ assert }) => {
    assert.deepEqual(validationIssuesFromRecord({ email: 'Email is invalid' }), [
      {
        code: 'VALIDATION_FIELD',
        path: 'email',
        message: 'Email is invalid',
      },
    ])
  })

  test('exposes canonical issues while preserving legacy field errors', ({ assert }) => {
    const error = ValidationException.fromIssues([
      validationIssue('email', 'Email is invalid', 'EMAIL_INVALID'),
      validationIssue('password', 'Password is required', 'PASSWORD_REQUIRED'),
    ])

    assert.deepEqual(error.issues, [
      { code: 'EMAIL_INVALID', path: 'email', message: 'Email is invalid' },
      { code: 'PASSWORD_REQUIRED', path: 'password', message: 'Password is required' },
    ])
    assert.deepEqual(error.errors, {
      email: 'Email is invalid',
      password: 'Password is required',
    })
  })

  test('assigns an object-level issue to legacy message-only exceptions', ({ assert }) => {
    const error = new ValidationException('Invalid input')

    assert.deepEqual(error.issues, [
      { code: 'E_VALIDATION', path: 'request', message: 'Invalid input' },
    ])
  })

  test('rejects an empty canonical issue list', ({ assert }) => {
    assert.throws(() => ValidationException.fromIssues([]), 'at least one validation issue')
  })
})
