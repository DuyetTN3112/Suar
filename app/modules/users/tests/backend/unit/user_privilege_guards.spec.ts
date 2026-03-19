import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { assertCanGrantSystemRole } from '#modules/users/actions/commands/register_user_command'
import { assertProfileMutationAllowed } from '#modules/users/actions/commands/update_user_profile_command'
import { buildRegisterUserDTO } from '#modules/users/controllers/mappers/request/user_request_mapper'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'

function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
  }
}

test.group('User privilege guards', () => {
  test('request mapper strips every role alias unless the actor is superadmin', ({ assert }) => {
    const aliases = ['role', 'systemRole', 'system_role', 'roleId'] as const

    for (const alias of aliases) {
      const ordinaryDto = buildRegisterUserDTO(
        fakeRequest({
          username: 'ordinary-user',
          email: 'ordinary@example.com',
          [alias]: SystemRoleName.SUPERADMIN,
          status: 'active',
        }) as never,
        SystemRoleName.REGISTERED_USER
      )
      assert.equal(ordinaryDto.roleId, '')

      const superadminDto = buildRegisterUserDTO(
        fakeRequest({
          username: 'admin-created-user',
          email: 'admin-created@example.com',
          [alias]: SystemRoleName.SYSTEM_ADMIN,
          status: 'active',
        }) as never,
        SystemRoleName.SUPERADMIN
      )
      assert.equal(superadminDto.roleId, SystemRoleName.SYSTEM_ADMIN)
    }
  })

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
