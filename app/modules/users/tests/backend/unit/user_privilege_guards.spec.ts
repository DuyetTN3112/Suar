import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { assertCanGrantSystemRole } from '#modules/users/actions/commands/user-lifecycle/register_user_command'
import { assertProfileMutationAllowed } from '#modules/users/actions/commands/profile/update_user_profile_command'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'

test.group('User privilege guards', () => {
  test('only a superadmin can grant a non-default system role', ({ assert }) => {
    assert.doesNotThrow(() =>
      assertCanGrantSystemRole(SystemRoleName.REGISTERED_USER, SystemRoleName.REGISTERED_USER)
    )
    assert.doesNotThrow(() =>
      assertCanGrantSystemRole(SystemRoleName.SUPERADMIN, SystemRoleName.SYSTEM_ADMIN)
    )
    assert.throws(
      () => assertCanGrantSystemRole(SystemRoleName.SYSTEM_ADMIN, SystemRoleName.SUPERADMIN),
      ForbiddenException
    )
    assert.throws(
      () => assertCanGrantSystemRole(null, SystemRoleName.SYSTEM_ADMIN),
      ForbiddenException
    )
  })

  test('profile updates require an exact self match or a system administrator', ({ assert }) => {
    assert.doesNotThrow(() =>
      assertProfileMutationAllowed('user-a', 'user-a', SystemRoleName.REGISTERED_USER)
    )
    assert.doesNotThrow(() =>
      assertProfileMutationAllowed('admin-a', 'user-a', SystemRoleName.SYSTEM_ADMIN)
    )
    assert.doesNotThrow(() =>
      assertProfileMutationAllowed('root-a', 'user-a', SystemRoleName.SUPERADMIN)
    )
    assert.throws(
      () => assertProfileMutationAllowed('user-b', 'user-a', SystemRoleName.REGISTERED_USER),
      ForbiddenException
    )
    assert.throws(
      () => assertProfileMutationAllowed('', '', SystemRoleName.REGISTERED_USER),
      ForbiddenException
    )
    assert.throws(
      () => assertProfileMutationAllowed('USER-A', 'user-a', SystemRoleName.REGISTERED_USER),
      ForbiddenException
    )
  })
})
