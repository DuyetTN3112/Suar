import { test } from '@japa/runner'

import { assertWildcardPermissionConfirmed } from '#modules/admin/permissions/controllers/permissions/custom_system_role_controller'
import ValidationException from '#modules/errors/public_contracts/validation_exception'

test.group('Custom system role controller rules', () => {
  test('wildcard permission requires explicit superadmin confirmation', ({ assert }) => {
    assert.doesNotThrow(() =>
      assertWildcardPermissionConfirmed(
        { permissions: ['can_view_system_logs'], confirmWildcard: false },
        'system_admin'
      )
    )
    assert.doesNotThrow(() =>
      assertWildcardPermissionConfirmed({ permissions: ['*'], confirmWildcard: true }, 'superadmin')
    )

    assert.throws(
      () =>
        assertWildcardPermissionConfirmed(
          { permissions: ['*'], confirmWildcard: false },
          'system_admin'
        ),
      ValidationException
    )
    assert.throws(
      () =>
        assertWildcardPermissionConfirmed(
          { permissions: ['*'], confirmWildcard: true },
          'system_admin'
        ),
      ValidationException
    )
  })
})
