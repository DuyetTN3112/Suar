import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { makeSystemAdminActionContext } from '#modules/admin/actions/admin_action_context'
import ListAuditLogsQuery from '#modules/admin/actions/audit_logs/queries/list_audit_logs_query'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'
import { ProjectFactory, TaskFactory } from '#tests/helpers/factories/project_task'
import { OrganizationFactory } from '#tests/helpers/factories/user_org'

async function countAuditEvents(action: string): Promise<number> {
  const result = (await db.from('audit_events').where('action', action).count('* as count')) as {
    count: number | string
  }[]

  return Number(result[0]?.count ?? 0)
}

test.group('Integration | Admin Audit Logs', (group) => {
  group.setup(async () => {
    await setupApp()
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

    const result = await new ListAuditLogsQuery(makeSystemAdminActionContext(superadmin.id)).handle(
      {
        page: 1,
        perPage: 50,
        search: actor.username,
      }
    )

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

    const firstWindow = await new ListAuditLogsQuery(
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

    const secondWindow = await new ListAuditLogsQuery(
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

    const newestWindow = await new ListAuditLogsQuery(
      makeSystemAdminActionContext(superadmin.id)
    ).handle({
      page: 1,
      perPage: 2,
      search: actor.username,
    })

    const jumpedWindow = await new ListAuditLogsQuery(
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

    const result = await new ListAuditLogsQuery(makeSystemAdminActionContext(superadmin.id)).handle(
      {
        page: 1,
        perPage: 50,
        surface: 'user',
        actorUserId: actor.id,
      }
    )

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
    })
    const otherProject = await ProjectFactory.create({
      organization_id: otherOrg.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
    })
    const otherTask = await TaskFactory.create({
      organization_id: otherOrg.id,
      project_id: otherProject.id,
      creator_id: owner.id,
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

    const result = await new ListAuditLogsQuery(makeSystemAdminActionContext(superadmin.id)).handle(
      {
        page: 1,
        perPage: 50,
        surface: 'organization',
        organizationId: org.id,
      }
    )

    assert.deepEqual(result.data.map((item) => item.action).sort(), [
      'org.member.invited',
      'project.updated',
      'task.assigned',
    ])
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

    const userResult = await new ListAuditLogsQuery(
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

    const orgResult = await new ListAuditLogsQuery(
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

    const foreignOrgResult = await new ListAuditLogsQuery(
      makeSystemAdminActionContext(systemAdmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'organization',
      organizationId: org.id,
      action: otherOrgAction,
    })
    assert.lengthOf(foreignOrgResult.data, 0)

    const systemResult = await new ListAuditLogsQuery(
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
