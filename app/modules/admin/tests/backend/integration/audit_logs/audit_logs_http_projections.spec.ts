import { test } from '@japa/runner'

import {
  auditPublicApi,
  configureAuditLogsTestGroup,
  OrganizationFactory,
  OrganizationUserFactory,
  randomUUID,
  UserFactory,
} from './support/audit_logs_test_support.js'

test.group('Admin Audit Logs - HTTP Projections and Privacy Guards', (group) => {
  configureAuditLogsTestGroup(group)

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
})
