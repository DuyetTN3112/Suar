import { test } from '@japa/runner'

import { makeSystemAdminActionContext } from '#modules/admin/users/actions/action_context'
import SuspendUserCommand from '#modules/admin/users/actions/command/suspend_user_command'
import UpdateUserSystemRoleCommand from '#modules/admin/users/actions/command/update_user_system_role_command'
import type { AdminMutationIdentityGenerator } from '#modules/admin/users/actions/ports/outbound/admin_mutation_identity_generator'
import type { AdminTransactionRunner } from '#modules/admin/users/actions/ports/outbound/admin_transaction_runner'
import type {
  AdminUserDirectory,
  AdminUserDirectoryRecord,
  AdminUserLifecycleWriter,
} from '#modules/admin/users/actions/ports/outbound/admin_user_administration'

function userRecord(
  id: string,
  systemRole: string,
  status = 'active'
): AdminUserDirectoryRecord {
  return {
    id,
    username: id,
    email: `${id}@example.test`,
    systemRole,
    status,
    currentOrganizationId: null,
    isExternalContributor: false,
    createdAt: '2026-07-26T00:00:00.000Z',
    updatedAt: '2026-07-26T00:00:00.000Z',
  }
}

function directoryFor(
  records: AdminUserDirectoryRecord[]
): AdminUserDirectory {
  return {
    listUsers: () => Promise.resolve({ users: records, total: records.length }),
    getUserStats: () =>
      Promise.resolve({
        total: records.length,
        active: records.filter((user) => user.status === 'active').length,
        suspended: records.filter((user) => user.status === 'suspended').length,
        newThisMonth: 0,
      }),
    findById: (userId) =>
      Promise.resolve(records.find((user) => user.id === userId) ?? null),
  }
}

function lifecycleSpy() {
  const calls: string[] = []
  const lifecycle: AdminUserLifecycleWriter = {
    updateSystemRole: (userId, role) => {
      calls.push(`role:${userId}:${role}`)
      return Promise.resolve()
    },
    updateStatus: (userId, status) => {
      calls.push(`status:${userId}:${status}`)
      return Promise.resolve()
    },
    stageAccountLifecycle: (event) => {
      calls.push(`lifecycle:${event.userId}:${event.action}`)
      return Promise.resolve()
    },
  }
  return { calls, lifecycle }
}

const unusedTransactions: AdminTransactionRunner = {
  run: () => Promise.reject(new Error('transaction must not be started')),
}
const unusedMutationIdentities: AdminMutationIdentityGenerator = {
  next: () => {
    throw new Error('mutation identity must not be generated')
  },
}

test.group('Admin user administration ports', () => {
  test('keeps superadmin suspension policy in Admin before lifecycle persistence', async ({
    assert,
  }) => {
    const actor = userRecord('actor', 'system_admin')
    const target = userRecord('target', 'superadmin')
    const writer = lifecycleSpy()
    const command = new SuspendUserCommand(
      makeSystemAdminActionContext(actor.id),
      directoryFor([actor, target]),
      writer.lifecycle,
      unusedTransactions,
      unusedMutationIdentities
    )

    await assert.rejects(
      () => command.handle({ userId: target.id, action: 'suspend' }),
      /Only superadmin can suspend other superadmins/
    )
    assert.isEmpty(writer.calls)
  })

  test('keeps superadmin promotion policy in Admin before lifecycle persistence', async ({
    assert,
  }) => {
    const actor = userRecord('actor', 'system_admin')
    const target = userRecord('target', 'registered_user')
    const writer = lifecycleSpy()
    const command = new UpdateUserSystemRoleCommand(
      makeSystemAdminActionContext(actor.id),
      directoryFor([actor, target]),
      writer.lifecycle,
      unusedTransactions
    )

    await assert.rejects(
      () =>
        command.handle({
          userId: target.id,
          systemRole: 'superadmin',
        }),
      /Only superadmin can create other superadmins/
    )
    assert.isEmpty(writer.calls)
  })
})
