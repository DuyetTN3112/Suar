import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { userExternalDependencies } from '#composition/users/user-external-dependencies/user_external_dependencies_composition'
import {
  userAccountRepository,
  userLifecycleEventStager,
  userRuntime,
  userTransactionRunner,
} from '#composition/users/user-persistence/user_persistence_composition'
import {
  makeSystemAdminActionContext,
  type AdminActionContext,
} from '#modules/admin/audit_logs/actions/action_context'
import { AdminAuditEventReader } from '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_event_reader'
import { AdminAuditProjectionReader } from '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_projection_reader'
import ListAuditLogsQuery from '#modules/admin/audit_logs/actions/queries/audit_logs/list_audit_logs_query'
import SuspendUserCommand from '#modules/admin/users/actions/commands/users/suspend_user_command'
import UpdateUserSystemRoleCommand from '#modules/admin/users/actions/commands/users/update_user_system_role_command'
import { AdminMutationIdentityGenerator } from '#modules/admin/users/actions/ports/outbound/users/admin_mutation_identity_generator'
import { AdminTransactionRunner } from '#modules/admin/users/actions/ports/outbound/users/admin_transaction_runner'
import {
  AdminUserDirectory,
  AdminUserLifecycleWriter,
} from '#modules/admin/users/actions/ports/outbound/users/admin_user_administration'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import DeactivateUserCommand from '#modules/users/actions/commands/user-lifecycle/deactivate_user_command'
import UpdateUserDetailsCommand from '#modules/users/actions/commands/profile/update_user_details_command'
import UpdateUserProfileCommand from '#modules/users/actions/commands/profile/update_user_profile_command'
import { UpdateUserDetailsDTO } from '#modules/users/actions/dtos/request/update_user_details_dto'
import type { UserNotificationStager as NotificationStager } from '#modules/users/actions/ports/outbound/user_notification_stager'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import User from '#modules/users/infra/models/profile/user'
import { UpdateUserProfileDTO } from '#modules/users/public_contracts/update_user_profile_dto'
import { SystemRoleName, UserStatusName } from '#modules/users/public_contracts/user_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

const notificationNoop: NotificationStager = {
  stage: () => Promise.resolve(),
}

let adminAuditEventReader: AdminAuditEventReader
let adminAuditProjectionReader: AdminAuditProjectionReader
let adminUserDirectory: AdminUserDirectory
let adminUserLifecycle: AdminUserLifecycleWriter
let adminTransactions: AdminTransactionRunner
let adminMutationIdentities: AdminMutationIdentityGenerator

function makeAdminListAuditLogsQuery(execCtx: AdminActionContext): ListAuditLogsQuery {
  return new ListAuditLogsQuery(execCtx, adminAuditEventReader, adminAuditProjectionReader)
}

test.group('Integration | User audit event coverage', (group) => {
  group.setup(async () => {
    const app = await setupApp()
    adminAuditEventReader = await app.container.make(AdminAuditEventReader)
    adminAuditProjectionReader = await app.container.make(AdminAuditProjectionReader)
    adminUserDirectory = await app.container.make(AdminUserDirectory)
    adminUserLifecycle = await app.container.make(AdminUserLifecycleWriter)
    adminTransactions = await app.container.make(AdminTransactionRunner)
    adminMutationIdentities = await app.container.make(AdminMutationIdentityGenerator)
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('account identity audit stores one minimized transactional diff and skips no-op writes', async ({
    assert,
  }) => {
    const user = await UserFactory.create({
      username: 'identity-before',
      email: 'identity-before@example.test',
    })
    const command = new UpdateUserProfileCommand(
      makeSystemUserActionContext(user.id),
      userTransactionRunner,
      userAccountRepository,
      userRuntime,
      userLifecycleEventStager
    )
    const dto = new UpdateUserProfileDTO(user.id, 'identity-after', 'identity-after@example.test')

    await command.handle(dto)
    await command.handle(dto)

    const events = (await db
      .from('audit_events')
      .where('event_name', 'user.profile.updated')
      .where('target_id', user.id)
      .select('id', 'old_values', 'new_values')) as {
      id: string
      old_values: Record<string, unknown>
      new_values: Record<string, unknown>
    }[]
    assert.lengthOf(events, 1)
    assert.deepEqual(events[0]?.old_values, {
      email: '[REDACTED:OLD]',
      username: 'identity-before',
    })
    assert.deepEqual(events[0]?.new_values, {
      email: '[REDACTED:NEW]',
      username: 'identity-after',
    })
    assert.notInclude(JSON.stringify(events), 'identity-before@example.test')
    assert.notInclude(JSON.stringify(events), 'identity-after@example.test')
    const event = events[0]
    if (!event) return

    const scopes = await db
      .from('audit_event_scopes')
      .where('event_id', event.id)
      .select('surface', 'user_id')
    assert.deepInclude(scopes, { surface: 'user', user_id: user.id })
  })

  test('profile details audit records changed fields only and protects PII values', async ({
    assert,
  }) => {
    const user = await UserFactory.create({ timezone: 'Asia/Ho_Chi_Minh' })
    await db
      .from('users')
      .where('id', user.id)
      .update({ bio: 'private-before', phone: '+84000000001' })
    const command = new UpdateUserDetailsCommand(
      makeSystemUserActionContext(user.id),
      userTransactionRunner,
      userAccountRepository,
      userRuntime,
      userLifecycleEventStager
    )
    const dto = new UpdateUserDetailsDTO({
      bio: 'private-after',
      phone: '+84000000002',
      timezone: 'UTC',
    })

    await command.handle(dto)
    await command.handle(dto)

    const events = (await db
      .from('audit_events')
      .where('event_name', 'user.profile.details_updated')
      .where('target_id', user.id)
      .select('old_values', 'new_values')) as {
      old_values: Record<string, unknown>
      new_values: Record<string, unknown>
    }[]
    assert.lengthOf(events, 1)
    assert.deepEqual(events[0]?.old_values, {
      bio: '[REDACTED:OLD]',
      phone: '[REDACTED:OLD]',
      timezone: 'Asia/Ho_Chi_Minh',
    })
    assert.deepEqual(events[0]?.new_values, {
      bio: '[REDACTED:NEW]',
      phone: '[REDACTED:NEW]',
      timezone: 'UTC',
    })
    assert.notInclude(JSON.stringify(events), 'private-before')
    assert.notInclude(JSON.stringify(events), '+84000000002')
  })

  test('system role and account status commands create affected-user evidence in the same mutation', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const user = await UserFactory.create({
      system_role: SystemRoleName.REGISTERED_USER,
      status: UserStatusName.ACTIVE,
    })
    const execCtx = makeSystemAdminActionContext(superadmin.id)

    await new UpdateUserSystemRoleCommand(
      execCtx,
      adminUserDirectory,
      adminUserLifecycle,
      adminTransactions
    ).handle({
      userId: user.id,
      systemRole: SystemRoleName.SYSTEM_ADMIN,
    })
    await new SuspendUserCommand(
      execCtx,
      adminUserDirectory,
      adminUserLifecycle,
      adminTransactions,
      adminMutationIdentities
    ).handle({
      userId: user.id,
      action: 'suspend',
    })
    await new SuspendUserCommand(
      execCtx,
      adminUserDirectory,
      adminUserLifecycle,
      adminTransactions,
      adminMutationIdentities
    ).handle({
      userId: user.id,
      action: 'activate',
    })

    const persistedUser = await User.findOrFail(user.id)
    assert.equal(persistedUser.system_role, SystemRoleName.SYSTEM_ADMIN)
    assert.equal(persistedUser.status, UserStatusName.ACTIVE)

    const events = (await db
      .from('audit_events')
      .where('target_type', 'user')
      .where('target_id', user.id)
      .whereIn('event_name', ['user.system_role.changed', 'user.account.status_changed'])
      .select('id', 'event_name')) as { id: string; event_name: string }[]
    assert.lengthOf(events, 3)

    const scopedEventIds = await db
      .from('audit_event_scopes')
      .whereIn(
        'event_id',
        events.map((event) => event.id)
      )
      .where('surface', 'user')
      .where('user_id', user.id)
      .select('event_id')
    assert.lengthOf(scopedEventIds, 3)
  })

  test('deactivation targets the affected user scope instead of the legacy plural entity', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const user = await UserFactory.create({ status: UserStatusName.ACTIVE })

    await new DeactivateUserCommand(
      makeSystemUserActionContext(superadmin.id),
      userTransactionRunner,
      notificationNoop,
      userExternalDependencies.permission,
      userAccountRepository,
      userRuntime,
      userLifecycleEventStager
    ).execute({
      user_id: user.id,
      reason: 'Private compliance reason',
    })

    const event = (await db
      .from('audit_events')
      .where('event_name', 'user.account.status_changed')
      .where('target_id', user.id)
      .select('id', 'entity_type', 'new_values')
      .first()) as
      | {
          id: string
          entity_type: string
          new_values: Record<string, unknown>
        }
      | undefined
    assert.isDefined(event)
    assert.equal(event?.entity_type, 'user')
    assert.deepEqual(event?.new_values, {
      reason_provided: true,
      status: UserStatusName.INACTIVE,
    })
    assert.notInclude(JSON.stringify(event), 'Private compliance reason')
    if (!event) return

    const userScope = (await db
      .from('audit_event_scopes')
      .where('event_id', event.id)
      .where('surface', 'user')
      .where('user_id', user.id)
      .first()) as { event_id: string } | undefined
    assert.isDefined(userScope)
  })

  test('system diagnostic checkpoints stay out of personal history', async ({ assert }) => {
    const systemAdmin = await UserFactory.createSuperadmin()
    const user = await UserFactory.create()
    const action = 'auth.login.completed.personal-boundary-test'

    await auditPublicApi.write(makeSystemAdminActionContext(user.id), {
      action,
      event_name: action,
      event_family: 'auth',
      module: 'auth',
      entity_type: 'auth_provider',
      entity_id: 'google',
      target_type: 'auth_provider',
      target_id: 'google',
      outcome: 'success',
      retention_class: 'support_trace',
      new_values: { diagnostic: true },
    })

    const personal = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(systemAdmin.id)
    ).handle({
      surface: 'user',
      actorUserId: user.id,
      action,
      perPage: 50,
    })
    const system = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(systemAdmin.id)
    ).handle({
      surface: 'system',
      action,
      perPage: 50,
    })

    assert.lengthOf(personal.data, 0)
    assert.lengthOf(system.data, 1)
  })
})
