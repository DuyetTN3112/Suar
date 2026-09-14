import { test } from '@japa/runner'

import {
  auditPublicApi,
  configureAuditLogsTestGroup,
  db,
  makeSystemAdminActionContext,
  OrganizationFactory,
  ProjectFactory,
  randomUUID,
  TaskFactory,
  UserFactory,
} from './support/audit_logs_test_support.js'

test.group('Admin Audit Logs - Scopes and Isolation', (group) => {
  const ctx = configureAuditLogsTestGroup(group)

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

    const result = await ctx.makeQuery(
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

    const taskNameSearchResult = await ctx.makeQuery(
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

    const projectNameSearchResult = await ctx.makeQuery(
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

    const organizationNameSearchResult = await ctx.makeQuery(
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

    const ipSearchResult = await ctx.makeQuery(
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

    const orgResult = await ctx.makeQuery(
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

    const userResult = await ctx.makeQuery(
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

    const orgResult = await ctx.makeQuery(
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

    const foreignOrgResult = await ctx.makeQuery(
      makeSystemAdminActionContext(systemAdmin.id)
    ).handle({
      page: 1,
      perPage: 50,
      surface: 'organization',
      organizationId: org.id,
      action: otherOrgAction,
    })
    assert.lengthOf(foreignOrgResult.data, 0)

    const systemResult = await ctx.makeQuery(
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
})
