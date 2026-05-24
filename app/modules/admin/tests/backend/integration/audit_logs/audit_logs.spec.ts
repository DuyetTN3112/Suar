import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
  organizationWriter,
} from '#composition/organizations/persistence/organization_persistence_composition'
import {
  makeSystemAdminActionContext,
  type AdminActionContext,
} from '#modules/admin/audit_logs/actions/action_context'
import { AdminAuditEventReader } from '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_event_reader'
import { AdminAuditProjectionReader } from '#modules/admin/audit_logs/actions/ports/outbound/audit_logs/admin_audit_projection_reader'
import ListAuditLogsQuery from '#modules/admin/audit_logs/actions/queries/audit_logs/list_audit_logs_query'
import { mapOrganizationAuditActivityResponse } from '#modules/admin/audit_logs/controllers/mappers/response/audit_logs/audit_log_surface_response_mapper'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { platformAuditLogger } from '#modules/observability/public_contracts/platform_audit_logger'
import UpdateCustomRolesCommand from '#modules/organizations/actions/commands/access/update_custom_roles_command'
import UpdateOrganizationSettingsCommand from '#modules/organizations/actions/commands/settings/update_organization_settings_command'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'
import { ProjectFactory, TaskFactory } from '#tests/helpers/factories/project_task'
import { OrganizationFactory, OrganizationUserFactory } from '#tests/helpers/factories/user_org'

let adminAuditEventReader: AdminAuditEventReader
let adminAuditProjectionReader: AdminAuditProjectionReader

function makeAdminListAuditLogsQuery(execCtx: AdminActionContext): ListAuditLogsQuery {
  return new ListAuditLogsQuery(execCtx, adminAuditEventReader, adminAuditProjectionReader)
}

async function countAuditEvents(action: string): Promise<number> {
  const result = (await db.from('audit_events').where('action', action).count('* as count')) as {
    count: number | string
  }[]

  return Number(result[0]?.count ?? 0)
}

test.group('Integration | Admin Audit Logs', (group) => {
  group.setup(async () => {
    const app = await setupApp()
    adminAuditEventReader = await app.container.make(AdminAuditEventReader)
    adminAuditProjectionReader = await app.container.make(AdminAuditProjectionReader)
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('lists Postgres-backed audit logs and resolves user info from Postgres', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const actor = await UserFactory.create({ username: 'audit_target_user' })
    const viewEventsBefore = await countAuditEvents('admin.audit_log.viewed')

    await db.table('audit_events').insert({
      user_id: actor.id,
      action: 'test_admin_audit_log',
      entity_type: 'task',
      entity_id: 'task-test-id',
      old_values: JSON.stringify({ status: 'todo' }),
      new_values: JSON.stringify({ status: 'done' }),
      ip_address: '127.0.0.1',
      user_agent: 'integration-test',
      occurred_at: new Date(),
    })

    const result = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      search: actor.username,
    })

    const log = result.data.find((item) => item.action === 'test_admin_audit_log')
    assert.isDefined(log)
    assert.equal(log?.user?.id, actor.id)
    assert.equal(log?.user?.username, actor.username)
    assert.equal(log?.resource_type, 'task')
    assert.equal(log?.resource_id, 'task-test-id')
    const newValues = (log?.details['new_values'] ?? {}) as { status?: string }
    assert.equal(newValues.status, 'done')
    assert.equal(await countAuditEvents('admin.audit_log.viewed'), viewEventsBefore + 1)
  })

  test('supports cursor pagination for older audit log windows without duplicates', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const actor = await UserFactory.create({ username: 'cursor_audit_user' })
    const baseTime = new Date('2026-07-05T12:00:00.000Z')

    for (let index = 0; index < 4; index++) {
      await db.table('audit_events').insert({
        user_id: actor.id,
        action: `cursor_audit_${index}`,
        entity_type: 'task',
        entity_id: `task-${index}`,
        old_values: JSON.stringify({ status: 'todo' }),
        new_values: JSON.stringify({ status: 'done' }),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date(baseTime.getTime() - index * 60_000),
      })
    }

    const firstWindow = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      page: 1,
      perPage: 2,
      search: actor.username,
    })

    assert.lengthOf(firstWindow.data, 2)
    assert.equal(firstWindow.data[0]?.action, 'cursor_audit_0')
    assert.equal(firstWindow.data[1]?.action, 'cursor_audit_1')
    assert.isTrue(firstWindow.meta.cursor.hasNextPage)
    assert.isNull(firstWindow.meta.cursor.previousCursor)
    assert.isString(firstWindow.meta.cursor.nextCursor)

    const secondWindow = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      page: 1,
      perPage: 2,
      after: firstWindow.meta.cursor.nextCursor,
      search: actor.username,
    })

    assert.lengthOf(secondWindow.data, 2)
    assert.equal(secondWindow.data[0]?.action, 'cursor_audit_2')
    assert.equal(secondWindow.data[1]?.action, 'cursor_audit_3')
    assert.isTrue(secondWindow.meta.cursor.hasPreviousPage)
    assert.isFalse(secondWindow.meta.cursor.hasNextPage)
    assert.isString(secondWindow.meta.cursor.previousCursor)
    assert.equal(
      secondWindow.data.filter((item) => firstWindow.data.some((first) => first.id === item.id))
        .length,
      0
    )
    assert.notDeepEqual(
      secondWindow.data.map((item) => item.id),
      firstWindow.data.map((item) => item.id)
    )
  })

  test('treats direct page-number jumps as newest cursor window to avoid offset drift', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const actor = await UserFactory.create({ username: 'cursor_page_jump_user' })
    const baseTime = new Date('2026-07-05T13:00:00.000Z')

    for (let index = 0; index < 4; index++) {
      await db.table('audit_events').insert({
        user_id: actor.id,
        action: `cursor_page_jump_${index}`,
        entity_type: 'task',
        entity_id: `jump-task-${index}`,
        old_values: JSON.stringify({ status: 'todo' }),
        new_values: JSON.stringify({ status: 'done' }),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date(baseTime.getTime() - index * 60_000),
      })
    }

    const newestWindow = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      page: 1,
      perPage: 2,
      search: actor.username,
    })

    const jumpedWindow = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      page: 3,
      perPage: 2,
      search: actor.username,
    })

    assert.deepEqual(
      jumpedWindow.data.map((item) => item.id),
      newestWindow.data.map((item) => item.id)
    )
    assert.equal(jumpedWindow.meta.currentPage, 1)
    assert.equal(jumpedWindow.meta.mode, 'cursor')
  })

  test('user scope only returns audit rows owned by or performed by that user', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const actor = await UserFactory.create({ username: 'self_audit_actor' })
    const otherActor = await UserFactory.create({ username: 'other_audit_actor' })

    await db.table('audit_events').insert([
      {
        user_id: actor.id,
        action: 'user.changed_password',
        entity_type: 'user',
        entity_id: actor.id,
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T14:00:00.000Z'),
      },
      {
        user_id: otherActor.id,
        action: 'user.profile_admin_update',
        entity_type: 'user',
        entity_id: actor.id,
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T14:01:00.000Z'),
      },
      {
        user_id: otherActor.id,
        action: 'user.changed_password',
        entity_type: 'user',
        entity_id: otherActor.id,
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T14:02:00.000Z'),
      },
    ])

    const result = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'user',
      actorUserId: actor.id,
    })

    assert.deepEqual(result.data.map((item) => item.action).sort(), [
      'user.changed_password',
      'user.profile_admin_update',
    ])
  })

  test('organization scope returns direct organization, project, and task audit rows only for that org', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: 'Scoped Audit Org' },
      { username: 'scoped_audit_owner' }
    )
    const otherOrg = await OrganizationFactory.create({ owner_id: owner.id })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: 'Compliance Launch Project',
    })
    const otherProject = await ProjectFactory.create({
      organization_id: otherOrg.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: 'Compliance Launch Project',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      title: 'Quarterly Audit Target',
    })
    const otherTask = await TaskFactory.create({
      organization_id: otherOrg.id,
      project_id: otherProject.id,
      creator_id: owner.id,
      title: 'Quarterly Audit Target',
    })

    await db.table('audit_events').insert([
      {
        user_id: owner.id,
        action: 'org.member.invited',
        entity_type: 'organization',
        entity_id: org.id,
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T15:00:00.000Z'),
      },
      {
        user_id: owner.id,
        action: 'project.updated',
        entity_type: 'project',
        entity_id: project.id,
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T15:01:00.000Z'),
      },
      {
        user_id: owner.id,
        action: 'task.assigned',
        entity_type: 'task',
        entity_id: task.id,
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T15:02:00.000Z'),
      },
      {
        user_id: owner.id,
        action: 'task.other_org',
        entity_type: 'task',
        entity_id: otherTask.id,
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T15:03:00.000Z'),
      },
    ])

    const result = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'organization',
      organizationId: org.id,
    })

    assert.deepEqual(result.data.map((item) => item.action).sort(), [
      'org.member.invited',
      'project.updated',
      'task.assigned',
    ])
    assert.equal(
      result.data.find((item) => item.action === 'task.assigned')?.target_label,
      task.title
    )

    const taskNameSearchResult = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'organization',
      organizationId: org.id,
      search: 'Quarterly Audit Target',
    })
    assert.deepEqual(
      taskNameSearchResult.data.map((item) => item.action),
      ['task.assigned']
    )
    assert.equal(taskNameSearchResult.data[0]?.target_label, task.title)

    const projectNameSearchResult = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'organization',
      organizationId: org.id,
      search: 'Compliance Launch Project',
    })
    assert.deepEqual(
      projectNameSearchResult.data.map((item) => item.action),
      ['project.updated']
    )

    const organizationNameSearchResult = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'organization',
      organizationId: org.id,
      search: 'Scoped Audit Org',
    })
    assert.deepEqual(
      organizationNameSearchResult.data.map((item) => item.action),
      ['org.member.invited']
    )

    const ipSearchResult = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'organization',
      organizationId: org.id,
      search: '127.0.0.1',
    })
    assert.lengthOf(ipSearchResult.data, 0)
  })

  test('enterprise audit write persists metadata, scopes, redaction, and hash', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: 'Enterprise Audit Org' },
      { username: 'enterprise_audit_owner' }
    )
    const affectedUser = await UserFactory.create({ username: 'enterprise_audit_member' })
    const action = `enterprise.audit.write.${Date.now()}`

    await auditPublicApi.write(
      {
        userId: owner.id,
        ip: '10.10.10.10',
        userAgent: 'enterprise-integration-test',
        organizationId: org.id,
        actorRoleSurface: 'org_owner',
        requestId: 'req-enterprise-1',
        traceId: 'trace-enterprise-1',
        workflowId: 'task_assignment',
      },
      {
        action,
        entity_type: 'task',
        entity_id: 'task-enterprise-1',
        event_name: 'task.assignment.created',
        event_family: 'workflow',
        module: 'tasks',
        subsystem: 'assignments',
        workflow: 'task_assignment',
        stage: 'completed',
        severity: 'info',
        outcome: 'success',
        target_type: 'task',
        target_id: 'task-enterprise-1',
        target_organization_id: org.id,
        affected_user_ids: [affectedUser.id],
        retention_class: 'security_audit',
        old_values: { status: 'todo', password: 'old-secret' },
        new_values: { status: 'done', refresh_token: 'new-token' },
      }
    )

    const row = (await db.from('audit_events').where('action', action).first()) as
      | Record<string, unknown>
      | undefined
    assert.isDefined(row)
    assert.equal(row?.['event_name'], 'task.assignment.created')
    assert.equal(row?.['module'], 'tasks')
    assert.equal(row?.['actor_user_id'], owner.id)
    assert.equal(row?.['actor_org_id'], org.id)
    assert.equal(row?.['actor_role_surface'], 'org_owner')
    assert.equal(row?.['target_org_id'], org.id)
    assert.equal(row?.['request_id'], 'req-enterprise-1')
    assert.equal(row?.['trace_id'], 'trace-enterprise-1')
    assert.equal(row?.['retention_class'], 'security_audit')
    assert.equal(row?.['redaction_applied'], true)
    const eventHash = row?.['event_hash']
    assert.equal(typeof eventHash, 'string')
    const eventHashText = typeof eventHash === 'string' ? eventHash : ''
    assert.match(eventHashText, /^[a-f0-9]{64}$/)

    const oldValues = row?.['old_values'] as Record<string, unknown>
    const newValues = row?.['new_values'] as Record<string, unknown>
    assert.equal(oldValues['password'], '[REDACTED]')
    assert.equal(newValues['refresh_token'], '[REDACTED]')

    const scopes = await db
      .from('audit_event_scopes')
      .where('event_id', row?.['id'] as string)
      .select('surface', 'user_id', 'organization_id')
      .orderBy('surface', 'asc')
      .orderBy('user_id', 'asc')

    assert.deepInclude(scopes, { surface: 'system', user_id: null, organization_id: null })
    assert.deepInclude(scopes, { surface: 'organization', user_id: null, organization_id: org.id })
    assert.deepInclude(scopes, { surface: 'user', user_id: owner.id, organization_id: null })
    assert.deepInclude(scopes, { surface: 'user', user_id: affectedUser.id, organization_id: null })
  })

  test('current organization context does not leak personal user events into organization scope', async ({
    assert,
  }) => {
    const systemAdmin = await UserFactory.createSuperadmin()
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: 'Personal Scope Isolation Org' },
      { username: 'personal_scope_actor' }
    )
    const personalAction = `user.profile.updated.${Date.now()}`
    const taskAction = `task.updated.${Date.now()}`
    const execCtx = {
      userId: owner.id,
      ip: '127.0.0.1',
      userAgent: 'integration-test',
      organizationId: org.id,
      requestId: 'req-scope-isolation',
      traceId: 'trace-scope-isolation',
      workflowId: null,
    }

    await auditPublicApi.write(execCtx, {
      action: personalAction,
      entity_type: 'user',
      entity_id: owner.id,
      old_values: { username: 'before' },
      new_values: { username: 'after' },
    })
    await auditPublicApi.write(execCtx, {
      action: taskAction,
      entity_type: 'task',
      entity_id: 'task-owned-by-current-org',
      old_values: { status: 'todo' },
      new_values: { status: 'in_progress' },
    })

    const personalRow = (await db.from('audit_events').where('action', personalAction).first()) as {
      id: string
      target_org_id: string | null
    }
    const taskRow = (await db.from('audit_events').where('action', taskAction).first()) as {
      id: string
      target_org_id: string | null
    }
    const personalScopes = (await db
      .from('audit_event_scopes')
      .where('event_id', personalRow.id)
      .select('surface', 'organization_id')) as {
      surface: string
      organization_id: string | null
    }[]
    const taskScopes = (await db
      .from('audit_event_scopes')
      .where('event_id', taskRow.id)
      .select('surface', 'organization_id')) as {
      surface: string
      organization_id: string | null
    }[]

    assert.isNull(personalRow.target_org_id)
    assert.notInclude(
      personalScopes.map((scope) => scope.surface),
      'organization'
    )
    assert.equal(taskRow.target_org_id, org.id)
    assert.deepInclude(taskScopes, { surface: 'organization', organization_id: org.id })

    const orgResult = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(systemAdmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'organization',
      organizationId: org.id,
      action: personalAction,
    })
    assert.lengthOf(orgResult.data, 0)
  })

  test('enterprise audit scopes drive user organization and system reads', async ({ assert }) => {
    const systemAdmin = await UserFactory.createSuperadmin()
    const actor = await UserFactory.create({ username: 'enterprise_scope_actor' })
    const affectedUser = await UserFactory.create({ username: 'enterprise_scope_affected' })
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: 'Enterprise Scoped Org' },
      { username: 'enterprise_scope_owner' }
    )
    const otherOrg = await OrganizationFactory.create({ owner_id: owner.id })
    const userEventId = randomUUID()
    const orgEventId = randomUUID()
    const otherOrgEventId = randomUUID()
    const userAction = `enterprise.scope.user.${Date.now()}`
    const orgAction = `enterprise.scope.org.${Date.now()}`
    const otherOrgAction = `enterprise.scope.other_org.${Date.now()}`

    await db.table('audit_events').insert([
      {
        id: userEventId,
        user_id: actor.id,
        action: userAction,
        event_name: 'task.assignment.created',
        entity_type: 'task',
        entity_id: 'task-scoped-user',
        target_type: 'task',
        target_id: 'task-scoped-user',
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T16:00:00.000Z'),
      },
      {
        id: orgEventId,
        user_id: owner.id,
        action: orgAction,
        event_name: 'billing.subscription.updated',
        entity_type: 'billing_subscription',
        entity_id: 'subscription-org',
        target_type: 'billing_subscription',
        target_id: 'subscription-org',
        target_org_id: org.id,
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T16:01:00.000Z'),
      },
      {
        id: otherOrgEventId,
        user_id: owner.id,
        action: otherOrgAction,
        event_name: 'billing.subscription.updated',
        entity_type: 'billing_subscription',
        entity_id: 'subscription-other-org',
        target_type: 'billing_subscription',
        target_id: 'subscription-other-org',
        target_org_id: otherOrg.id,
        old_values: JSON.stringify({}),
        new_values: JSON.stringify({}),
        ip_address: '127.0.0.1',
        user_agent: 'integration-test',
        occurred_at: new Date('2026-07-05T16:02:00.000Z'),
      },
    ])

    await db.table('audit_event_scopes').insert([
      { event_id: userEventId, surface: 'system' },
      { event_id: userEventId, surface: 'user', user_id: affectedUser.id },
      { event_id: orgEventId, surface: 'system' },
      { event_id: orgEventId, surface: 'organization', organization_id: org.id },
      { event_id: otherOrgEventId, surface: 'system' },
      { event_id: otherOrgEventId, surface: 'organization', organization_id: otherOrg.id },
    ])

    const userResult = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(systemAdmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'user',
      actorUserId: affectedUser.id,
      action: userAction,
    })
    assert.deepEqual(
      userResult.data.map((item) => item.action),
      [userAction]
    )

    const orgResult = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(systemAdmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'organization',
      organizationId: org.id,
      action: orgAction,
    })
    assert.deepEqual(
      orgResult.data.map((item) => item.action),
      [orgAction]
    )

    const foreignOrgResult = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(systemAdmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'organization',
      organizationId: org.id,
      action: otherOrgAction,
    })
    assert.lengthOf(foreignOrgResult.data, 0)

    const systemResult = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(systemAdmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'system',
      action: otherOrgAction,
    })
    assert.deepEqual(
      systemResult.data.map((item) => item.action),
      [otherOrgAction]
    )
  })

  test('organization audit route enforces the organization-scoped audit permission', async ({
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: 'Audit Permission Org' },
      { username: 'audit_permission_owner' }
    )
    const administrator = await UserFactory.create({
      username: 'audit_permission_administrator',
      current_organization_id: org.id,
    })
    const member = await UserFactory.create({
      username: 'audit_permission_member',
      current_organization_id: org.id,
    })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: administrator.id,
      org_role: 'org_admin',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const ownerResponse = await client
      .get('/org/audit-logs')
      .loginAs(owner)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')
    const administratorResponse = await client
      .get('/org/audit-logs')
      .loginAs(administrator)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')
    const memberResponse = await client.get('/org/audit-logs').redirects(0).loginAs(member)

    ownerResponse.assertStatus(200)
    administratorResponse.assertStatus(200)
    memberResponse.assertStatus(302)
    memberResponse.assertHeader('location', '/')
  })

  test('organization audit HTTP contract exposes only the organization-safe projection', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: 'Audit Projection Org' },
      { username: 'audit_projection_owner' }
    )
    const action = 'organization.contract_projection_checked'
    const execCtx = {
      userId: owner.id,
      ip: '198.51.100.27',
      userAgent: 'sensitive-integration-agent',
      organizationId: org.id,
      requestId: 'request-must-not-leak',
      traceId: 'trace-must-not-leak',
      workflowId: 'workflow-must-not-leak',
    }

    await auditPublicApi.write(execCtx, {
      action,
      entity_type: 'organization',
      entity_id: org.id,
      target_type: 'organization',
      target_id: org.id,
      target_organization_id: org.id,
      outcome: 'success',
      critical: true,
      old_values: {
        name: 'Audit Projection Before',
        password: 'must-not-leak',
      },
      new_values: {
        name: 'Audit Projection After',
        api_token: 'must-not-leak',
      },
    })

    const response = await client
      .get(`/org/audit-logs?action=${encodeURIComponent(action)}`)
      .loginAs(owner)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    response.assertStatus(200)
    const page = response.body() as {
      component: string
      props: {
        auditLogs: Record<string, unknown>[]
      }
    }
    assert.equal(page.component, 'org/audit_logs/index')
    assert.lengthOf(page.props.auditLogs, 1)

    const activity = page.props.auditLogs[0]
    assert.isDefined(activity)
    if (!activity) return

    assert.sameMembers(Object.keys(activity), [
      'id',
      'category',
      'outcome',
      'title',
      'description',
      'occurredAt',
      'actionCode',
      'actionKey',
      'actor',
      'target',
      'changes',
      'changeCount',
      'actorLabel',
      'subjectLabel',
    ])
    assert.deepEqual(activity['actor'], {
      type: 'user',
      label: owner.username,
      roleLabel: null,
    })
    assert.deepEqual(activity['target'], {
      type: 'organization',
      id: org.id,
      label: 'Audit Projection After',
    })
    assert.deepEqual(activity['changes'], [
      {
        field: 'name',
        operation: 'changed',
        before: 'Audit Projection Before',
        after: 'Audit Projection After',
        redacted: false,
      },
    ])

    const serializedActivity = JSON.stringify(activity)
    assert.notInclude(serializedActivity, '198.51.100.27')
    assert.notInclude(serializedActivity, 'sensitive-integration-agent')
    assert.notInclude(serializedActivity, 'request-must-not-leak')
    assert.notInclude(serializedActivity, 'trace-must-not-leak')
    assert.notInclude(serializedActivity, 'workflow-must-not-leak')
    assert.notInclude(serializedActivity, 'must-not-leak')
  })

  test('personal audit HTTP contract is viewer-scoped, filter-restricted, and privacy-safe', async ({
    assert,
    client,
  }) => {
    const viewer = await UserFactory.create({
      username: 'personal_audit_viewer',
      email: 'personal-audit-viewer@example.test',
    })
    const administrator = await UserFactory.create({
      username: 'personal_actor_identity_must_not_leak',
      email: 'personal-actor-must-not-leak@example.test',
    })
    const foreignUser = await UserFactory.create({
      username: 'personal_audit_foreign_user',
    })
    const action = `user.profile.updated.${randomUUID()}`
    const foreignAction = `user.profile.foreign.${randomUUID()}`

    await auditPublicApi.write(
      {
        userId: administrator.id,
        ip: '198.51.100.71',
        userAgent: 'personal-sensitive-agent',
        organizationId: null,
        requestId: 'personal-request-must-not-leak',
        traceId: 'personal-trace-must-not-leak',
        workflowId: null,
      },
      {
        action,
        entity_type: 'user',
        entity_id: viewer.id,
        target_type: 'user',
        target_id: viewer.id,
        event_name: 'user.profile.updated',
        event_family: 'user.profile',
        module: 'users',
        outcome: 'success',
        critical: true,
        old_values: {
          username: 'viewer-before',
          email: 'viewer-before@example.test',
          password: 'personal-secret-before',
          trust_score: 10,
        },
        new_values: {
          username: 'viewer-after',
          email: 'viewer-after@example.test',
          password: 'personal-secret-after',
          trust_score: 20,
        },
      }
    )
    await auditPublicApi.write(
      {
        userId: foreignUser.id,
        ip: '203.0.113.19',
        userAgent: 'foreign-agent',
        organizationId: null,
      },
      {
        action: foreignAction,
        entity_type: 'user',
        entity_id: foreignUser.id,
        target_type: 'user',
        target_id: foreignUser.id,
        event_name: 'user.profile.updated',
        outcome: 'success',
        critical: true,
        old_values: { username: 'foreign-before' },
        new_values: { username: 'foreign-after' },
      }
    )

    const response = await client
      .get(
        `/settings/audit-logs?search=profile&resourceType=user&outcome=success&action=${encodeURIComponent(
          foreignAction
        )}&userId=${encodeURIComponent(foreignUser.id)}`
      )
      .loginAs(viewer)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    response.assertStatus(200)
    const page = response.body() as {
      component: string
      props: {
        auditLogs: Record<string, unknown>[]
        filters: Record<string, unknown>
      }
    }
    assert.equal(page.component, 'settings/audit_logs')
    assert.lengthOf(page.props.auditLogs, 1)
    assert.sameMembers(Object.keys(page.props.filters), [
      'search',
      'resourceType',
      'outcome',
      'from',
      'to',
      'after',
      'before',
    ])
    assert.deepEqual(page.props.filters, {
      search: 'profile',
      resourceType: 'user',
      outcome: 'success',
      from: null,
      to: null,
      after: null,
      before: null,
    })

    const activity = page.props.auditLogs[0]
    assert.isDefined(activity)
    if (!activity) return

    assert.sameMembers(Object.keys(activity), [
      'id',
      'category',
      'outcome',
      'title',
      'description',
      'occurredAt',
      'activityKey',
      'perspective',
      'actor',
      'subject',
      'changes',
      'changeCount',
      'hasHiddenChanges',
    ])
    assert.equal(activity['activityKey'], 'account.profile_updated')
    assert.equal(activity['perspective'], 'affected_you')
    assert.deepEqual(activity['actor'], {
      type: 'another_authorized_user',
      label: 'Người có thẩm quyền',
    })
    assert.deepEqual(activity['changes'], [
      {
        field: 'email',
        operation: 'changed',
        before: null,
        after: null,
        redacted: true,
      },
      {
        field: 'username',
        operation: 'changed',
        before: 'viewer-before',
        after: 'viewer-after',
        redacted: false,
      },
    ])
    assert.isTrue(activity['hasHiddenChanges'])

    const serializedActivity = JSON.stringify(activity)
    assert.notInclude(serializedActivity, action)
    assert.notInclude(serializedActivity, foreignAction)
    assert.notInclude(serializedActivity, administrator.id)
    assert.notInclude(serializedActivity, administrator.username)
    assert.notInclude(serializedActivity, viewer.id)
    assert.notInclude(serializedActivity, foreignUser.id)
    assert.notInclude(serializedActivity, '198.51.100.71')
    assert.notInclude(serializedActivity, 'personal-sensitive-agent')
    assert.notInclude(serializedActivity, 'personal-request-must-not-leak')
    assert.notInclude(serializedActivity, 'personal-trace-must-not-leak')
    assert.notInclude(serializedActivity, 'viewer-before@example.test')
    assert.notInclude(serializedActivity, 'personal-secret')

    for (const privateSearch of [
      administrator.username,
      administrator.id,
      '198.51.100.71',
      'personal-request-must-not-leak',
    ]) {
      const privateSearchResponse = await client
        .get(`/settings/audit-logs?search=${encodeURIComponent(privateSearch)}`)
        .loginAs(viewer)
        .header('X-Inertia', 'true')
        .header('X-Inertia-Version', '1')
      privateSearchResponse.assertStatus(200)
      const privateSearchPage = privateSearchResponse.body() as {
        props: { auditLogs: unknown[] }
      }
      assert.lengthOf(privateSearchPage.props.auditLogs, 0)
    }
  })

  test('personal audit route requires authentication', async ({ client }) => {
    const response = await client.get('/settings/audit-logs').redirects(0)

    response.assertStatus(401)
  })

  test('personal audit HTTP filters are capped and reject unsupported values', async ({
    assert,
    client,
  }) => {
    const user = await UserFactory.create()
    const longSearch = 'a'.repeat(180)
    const response = await client
      .get(
        `/settings/audit-logs?search=${longSearch}&resourceType=audit_events&outcome=unknown&from=2026-07-23T12:00:00.000Z&to=2026-07-22T12:00:00.000Z`
      )
      .loginAs(user)
      .header('X-Inertia', 'true')
      .header('X-Inertia-Version', '1')

    response.assertStatus(200)
    const page = response.body() as {
      props: {
        filters: Record<string, unknown>
      }
    }
    assert.equal(page.props.filters['search'], 'a'.repeat(120))
    assert.isNull(page.props.filters['resourceType'])
    assert.isNull(page.props.filters['outcome'])
    assert.isNull(page.props.filters['from'])
    assert.isNull(page.props.filters['to'])
  })

  test('HTTP organization governance flow snapshots actor role and affected-user scope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: 'HTTP Audit Context Org' },
      { username: 'http_audit_context_owner' }
    )
    const invitee = await UserFactory.create({
      username: 'http_audit_context_invitee',
      email: 'http-audit-context-invitee@example.test',
    })

    const response = await client
      .post('/org/members/invite')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        email: invitee.email,
        roleId: 'org_admin',
      })
    response.assertStatus(204)

    const event = (await db
      .from('audit_events')
      .where('action', 'invite')
      .where('actor_user_id', owner.id)
      .where('target_org_id', org.id)
      .first()) as { id: string; actor_role_surface: string | null } | undefined
    assert.isDefined(event)
    assert.equal(event?.actor_role_surface, 'org_owner')
    if (!event) return

    const scopes = (await db
      .from('audit_event_scopes')
      .where('event_id', event.id)
      .select('surface', 'user_id', 'organization_id')) as {
      surface: string
      user_id: string | null
      organization_id: string | null
    }[]
    assert.deepInclude(scopes, {
      surface: 'organization',
      user_id: null,
      organization_id: org.id,
    })
    assert.deepInclude(scopes, {
      surface: 'user',
      user_id: owner.id,
      organization_id: null,
    })
    assert.deepInclude(scopes, {
      surface: 'user',
      user_id: invitee.id,
      organization_id: null,
    })
  })

  test('organization settings and custom-role mutations produce accountable organization evidence', async ({
    assert,
  }) => {
    const systemAdmin = await UserFactory.createSuperadmin()
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: 'Audit Mutation Before' },
      { username: 'audit_mutation_owner' }
    )
    const execCtx = {
      userId: owner.id,
      ip: '127.0.0.1',
      userAgent: 'integration-test',
      organizationId: org.id,
      requestId: 'req-org-audit-mutation',
      traceId: 'trace-org-audit-mutation',
      workflowId: null,
    }

    await new UpdateOrganizationSettingsCommand(
      execCtx,
      organizationTransactionRunner,
      organizationReader,
      organizationWriter,
      organizationMembershipRepository
    ).handle({
      name: 'Audit Mutation After',
      website: 'https://audit.example.test',
    })
    await new UpdateCustomRolesCommand(
      execCtx,
      organizationTransactionRunner,
      organizationReader,
      organizationWriter,
      organizationMembershipRepository
    ).handle({
      custom_roles: [
        {
          name: 'Compliance Reviewer',
          permissions: ['can_view_audit_logs'],
        },
      ],
    })

    const settingsResult = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(systemAdmin.id)
    ).handle({
      page: 1,
      perPage: 10,
      surface: 'organization',
      organizationId: org.id,
      action: 'organization.settings.updated',
    })
    const rolesResult = await makeAdminListAuditLogsQuery(
      makeSystemAdminActionContext(systemAdmin.id)
    ).handle({
      page: 1,
      perPage: 10,
      surface: 'organization',
      organizationId: org.id,
      action: 'organization.custom_roles.updated',
    })

    assert.lengthOf(settingsResult.data, 1)
    assert.lengthOf(rolesResult.data, 1)

    const settingsLog = settingsResult.data[0]
    const rolesLog = rolesResult.data[0]
    assert.isDefined(settingsLog)
    assert.isDefined(rolesLog)
    if (!settingsLog || !rolesLog) return

    const settingsActivity = mapOrganizationAuditActivityResponse(settingsLog)
    const rolesActivity = mapOrganizationAuditActivityResponse(rolesLog)

    assert.equal(settingsActivity.actor.roleLabel, 'org_owner')
    assert.equal(settingsActivity.target.type, 'organization')
    assert.equal(settingsActivity.target.id, org.id)
    assert.deepInclude(settingsActivity.changes, {
      field: 'name',
      operation: 'changed',
      before: 'Audit Mutation Before',
      after: 'Audit Mutation After',
      redacted: false,
    })
    assert.deepInclude(settingsActivity.changes, {
      field: 'website',
      operation: 'changed',
      before: null,
      after: 'https://audit.example.test',
      redacted: false,
    })
    assert.deepEqual(rolesActivity.changes, [
      {
        field: 'custom_role.compliance_reviewer',
        operation: 'added',
        before: null,
        after: 'can_view_audit_logs',
        redacted: false,
      },
    ])
  })

  test('organization governance mutations roll back when their critical audit write fails', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: 'Atomic Audit Original' },
      { username: 'atomic_audit_owner' }
    )
    const execCtx = {
      userId: owner.id,
      ip: '127.0.0.1',
      userAgent: 'integration-test',
      organizationId: org.id,
      requestId: 'req-atomic-audit',
      traceId: 'trace-atomic-audit',
      workflowId: null,
    }
    const failingAuditWriter = {
      write(): Promise<void> {
        return Promise.reject(new Error('forced critical audit failure'))
      },
    }

    await assert.rejects(
      () =>
        new UpdateOrganizationSettingsCommand(
          execCtx,
          organizationTransactionRunner,
          organizationReader,
          organizationWriter,
          organizationMembershipRepository,
          failingAuditWriter
        ).handle({
          name: 'Must Roll Back',
        }),
      /forced critical audit failure/
    )
    await org.refresh()
    assert.equal(org.name, 'Atomic Audit Original')

    await assert.rejects(
      () =>
        new UpdateCustomRolesCommand(
          execCtx,
          organizationTransactionRunner,
          organizationReader,
          organizationWriter,
          organizationMembershipRepository,
          failingAuditWriter
        ).handle({
          custom_roles: [
            {
              name: 'auditor',
              permissions: ['can_view_audit_logs'],
            },
          ],
        }),
      /forced critical audit failure/
    )
    await org.refresh()
    assert.deepEqual(org.custom_roles ?? [], [])
    assert.equal(await countAuditEvents('organization.settings.updated'), 0)
    assert.equal(await countAuditEvents('organization.custom_roles.updated'), 0)
  })

  test('concurrent enterprise audit writes keep a single hash chain without forks', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner(
      { name: 'Concurrent Audit Hash Org' },
      { username: 'concurrent_audit_hash_owner' }
    )
    const actionPrefix = `enterprise.concurrent_hash.${Date.now()}`
    const execCtx = {
      userId: owner.id,
      ip: '127.0.0.1',
      userAgent: 'integration-test',
      organizationId: org.id,
      requestId: 'req-concurrent-audit',
      traceId: 'trace-concurrent-audit',
      workflowId: null,
    }

    await Promise.all(
      Array.from({ length: 8 }, async (_, index) => {
        await auditPublicApi.write(execCtx, {
          action: `${actionPrefix}.${index}`,
          entity_type: 'task',
          entity_id: `concurrent-task-${index}`,
          target_type: 'task',
          target_id: `concurrent-task-${index}`,
          target_organization_id: org.id,
          outcome: 'success',
          critical: true,
          new_values: { status: 'done' },
        })
      })
    )

    const rows = (await db
      .from('audit_events')
      .whereLike('action', `${actionPrefix}.%`)
      .select('event_hash', 'prev_hash')) as {
      event_hash: string
      prev_hash: string | null
    }[]
    assert.lengthOf(rows, 8)

    const hashes = new Set(rows.map((row) => row.event_hash))
    const previousHashes = rows.map((row) => row.prev_hash)
    assert.equal(hashes.size, 8)
    assert.equal(new Set(previousHashes).size, 8)
    assert.equal(
      previousHashes.filter(
        (previousHash): previousHash is string => previousHash !== null && hashes.has(previousHash)
      ).length,
      7
    )
  })

  test('system audit API supports forensic filters and returns sealed redacted evidence', async ({
    assert,
    client,
  }) => {
    const systemAdmin = await UserFactory.create({
      username: 'system_audit_operator',
      system_role: 'system_admin',
    })
    const targetOwner = await UserFactory.create({ username: 'system_audit_target_owner' })
    const targetOrganization = await OrganizationFactory.create({
      owner_id: targetOwner.id,
      name: 'System Audit Evidence Org',
    })
    const targetProject = await ProjectFactory.create({
      organization_id: targetOrganization.id,
      creator_id: targetOwner.id,
      owner_id: targetOwner.id,
      name: 'System Audit Evidence Project',
    })
    const targetTask = await TaskFactory.create({
      organization_id: targetOrganization.id,
      project_id: targetProject.id,
      creator_id: targetOwner.id,
      title: 'System Audit Evidence Task',
    })
    const action = `system.audit.forensic.${randomUUID()}`
    const traceId = `trace-system-audit-${randomUUID()}`
    const requestId = `request-system-audit-${randomUUID()}`
    const correlationKey = `correlation-system-audit-${randomUUID()}`

    await auditPublicApi.write(
      {
        userId: systemAdmin.id,
        ip: '198.51.100.88',
        userAgent: 'system-audit-forensic-agent',
        organizationId: null,
        actorRoleSurface: 'system_admin',
        requestId,
        traceId,
        workflowId: 'release_pipeline',
      },
      {
        action,
        entity_type: 'task',
        entity_id: targetTask.id,
        event_name: 'task.release.approval_warning',
        event_family: 'release_governance',
        module: 'tasks',
        subsystem: 'release_controls',
        workflow: 'release_pipeline',
        stage: 'approval',
        severity: 'warn',
        outcome: 'warning',
        actor_type: 'automation',
        actor_role_surface: 'system_admin',
        target_type: 'task',
        target_id: targetTask.id,
        target_organization_id: targetOrganization.id,
        correlation_key: correlationKey,
        retention_class: 'security_audit',
        old_values: {
          status: 'in_review',
          api_token: 'system-secret-before',
        },
        new_values: {
          status: 'blocked',
          client_secret: 'system-secret-after',
        },
      }
    )

    const response = await client.get('/api/admin/audit-logs').loginAs(systemAdmin).qs({
      module: 'tasks',
      workflow: 'release_pipeline',
      severity: 'warn',
      outcome: 'warning',
      actorType: 'automation',
      retentionClass: 'security_audit',
      traceId,
    })

    response.assertStatus(200)
    const body = response.body() as {
      data: Array<{
        action: string
        details: {
          oldValues: Record<string, unknown>
          newValues: Record<string, unknown>
        }
        investigation: {
          eventName: string | null
          module: string | null
          workflow: string | null
          severity: string | null
          outcome: string | null
          initiatorType: string | null
          actorRoleSurface: string | null
          targetLabel: string | null
          requestId: string | null
          traceId: string | null
          correlationKey: string | null
          retentionClass: string | null
          integrity: {
            status: string
            eventHash: string | null
            previousHash: string | null
            schemaVersion: number
            redactionApplied: boolean
            defensiveRedactionApplied: boolean
          }
        }
      }>
      filters: Record<string, unknown>
    }

    assert.lengthOf(body.data, 1)
    const event = body.data[0]
    assert.equal(event?.action, action)
    assert.equal(event?.details.oldValues['api_token'], '[REDACTED]')
    assert.equal(event?.details.newValues['client_secret'], '[REDACTED]')
    assert.deepInclude(event?.investigation, {
      eventName: 'task.release.approval_warning',
      module: 'tasks',
      workflow: 'release_pipeline',
      severity: 'warn',
      outcome: 'warning',
      initiatorType: 'automation',
      actorRoleSurface: 'system_admin',
      targetLabel: targetTask.title,
      requestId,
      traceId,
      correlationKey,
      retentionClass: 'security_audit',
    })
    assert.deepInclude(event?.investigation.integrity, {
      status: 'verified',
      schemaVersion: 2,
      redactionApplied: true,
      defensiveRedactionApplied: false,
    })
    assert.match(event?.investigation.integrity.eventHash ?? '', /^[a-f0-9]{64}$/)
    assert.deepInclude(body.filters, {
      module: 'tasks',
      workflow: 'release_pipeline',
      severity: 'warn',
      outcome: 'warning',
      actorType: 'automation',
      retentionClass: 'security_audit',
      traceId,
    })

    const serializedEvent = JSON.stringify(event)
    assert.notInclude(serializedEvent, 'system-secret-before')
    assert.notInclude(serializedEvent, 'system-secret-after')

    for (const search of [requestId, correlationKey, 'system-audit-forensic-agent']) {
      const searchResponse = await client
        .get('/api/admin/audit-logs')
        .loginAs(systemAdmin)
        .qs({ search, action })

      searchResponse.assertStatus(200)
      const searchBody = searchResponse.body() as {
        data: Array<{ action: string }>
      }
      assert.equal(searchBody.data[0]?.action, action)
    }
  })

  test('system audit API detects persisted evidence tampering and defensively redacts it', async ({
    assert,
    client,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const action = `system.audit.tampered.${randomUUID()}`

    await auditPublicApi.write(
      {
        userId: superadmin.id,
        ip: '203.0.113.44',
        userAgent: 'tamper-detection-agent',
        organizationId: null,
        requestId: 'request-tamper-detection',
        traceId: 'trace-tamper-detection',
      },
      {
        action,
        entity_type: 'system_setting',
        entity_id: 'tamper-target',
        event_name: 'system.setting.updated',
        module: 'system',
        severity: 'error',
        outcome: 'failure',
        retention_class: 'compliance_audit',
        old_values: { enabled: false },
        new_values: { enabled: true },
      }
    )

    await db
      .from('audit_events')
      .where('action', action)
      .update({
        new_values: JSON.stringify({
          enabled: true,
          refresh_token: 'tampered-secret-must-not-leak',
        }),
      })

    const response = await client.get('/api/admin/audit-logs').loginAs(superadmin).qs({ action })

    response.assertStatus(200)
    const body = response.body() as {
      data: Array<{
        details: { newValues: Record<string, unknown> }
        investigation: {
          integrity: {
            status: string
            redactionApplied: boolean
            defensiveRedactionApplied: boolean
          }
        }
      }>
    }
    const event = body.data[0]
    assert.isDefined(event)
    if (!event) return
    assert.equal(event.details.newValues['refresh_token'], '[REDACTED]')
    assert.deepEqual(event.investigation.integrity, {
      ...event.investigation.integrity,
      status: 'mismatch',
      redactionApplied: false,
      defensiveRedactionApplied: true,
    })
    assert.notInclude(JSON.stringify(event), 'tampered-secret-must-not-leak')
  })

  test('platform audit logger preserves the redaction marker after pre-redacting its payload', async ({
    assert,
  }) => {
    const actor = await UserFactory.create({ username: 'platform_audit_redaction_actor' })
    const action = `platform.audit.redaction.${randomUUID()}`

    await platformAuditLogger.record(
      {
        userId: actor.id,
        ip: '192.0.2.61',
        userAgent: 'platform-audit-redaction-agent',
        organizationId: null,
        requestId: 'request-platform-redaction',
        traceId: 'trace-platform-redaction',
        workflowId: 'platform_redaction',
      },
      {
        event_name: action,
        event_family: 'platform.security',
        module: 'observability',
        subsystem: 'audit',
        workflow: 'platform_redaction',
        stage: 'completed',
        severity: 'warn',
        outcome: 'warning',
        occurred_at: new Date().toISOString(),
        actor: {
          initiator_type: 'system',
          user_id: actor.id,
          role_surface: 'system_admin',
        },
        request: {
          id: 'request-platform-redaction',
          ip: '192.0.2.61',
          user_agent: 'platform-audit-redaction-agent',
        },
        trace: {
          id: 'trace-platform-redaction',
          workflow_id: 'platform_redaction',
          correlation_key: 'correlation-platform-redaction',
        },
        target: {
          type: 'system_setting',
          id: 'platform-redaction-target',
        },
        change: {
          api_token: 'platform-secret-must-not-leak',
        },
        runtime: {
          duration_ms: 37,
        },
        error: null,
        compliance: {
          redaction_applied: false,
          retention_class: 'security_audit',
          contains_sensitive_fields: true,
        },
      }
    )

    const row = (await db
      .from('audit_events')
      .where('action', action)
      .select('redaction_applied', 'new_values')
      .first()) as {
      redaction_applied: boolean
      new_values: Record<string, unknown>
    }

    assert.isTrue(row.redaction_applied)
    assert.equal((row.new_values['change'] as Record<string, unknown>)['api_token'], '[REDACTED]')
    assert.notInclude(JSON.stringify(row.new_values), 'platform-secret-must-not-leak')
  })

  test('admin audit log routes deny non-admin and guest access without leaking audit rows', async ({
    assert,
    client,
  }) => {
    const regularUser = await UserFactory.create({ system_role: 'registered_user' })
    const sentinelAction = `forbidden_audit_route_${Date.now()}`

    await db.table('audit_events').insert({
      user_id: regularUser.id,
      action: sentinelAction,
      entity_type: 'task',
      entity_id: 'forbidden-audit-route-task',
      old_values: JSON.stringify({ status: 'todo' }),
      new_values: JSON.stringify({ status: 'done' }),
      ip_address: '127.0.0.1',
      user_agent: 'integration-test',
      occurred_at: new Date(),
    })

    const viewEventsBefore = await countAuditEvents('admin.audit_log.viewed')

    const regularWebResponse = await client.get('/admin/audit-logs').loginAs(regularUser)
    const regularApiResponse = await client
      .get('/api/admin/audit-logs')
      .header('accept', 'application/json')
      .loginAs(regularUser)
    const guestWebResponse = await client.get('/admin/audit-logs').redirects(0)
    const guestApiResponse = await client
      .get('/api/admin/audit-logs')
      .header('accept', 'application/json')

    regularWebResponse.assertStatus(403)
    regularApiResponse.assertStatus(403)
    guestWebResponse.assertStatus(401)
    guestApiResponse.assertStatus(401)

    for (const response of [
      regularWebResponse,
      regularApiResponse,
      guestWebResponse,
      guestApiResponse,
    ]) {
      assert.notInclude(response.text(), sentinelAction)
      assert.notInclude(response.text(), 'forbidden-audit-route-task')
      assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
    }
    assert.equal(await countAuditEvents('admin.audit_log.viewed'), viewEventsBefore)
  })
})
