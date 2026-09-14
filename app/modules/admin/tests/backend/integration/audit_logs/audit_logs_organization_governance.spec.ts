import { test } from '@japa/runner'

import {
  configureAuditLogsTestGroup,
  countAuditEvents,
  db,
  makeSystemAdminActionContext,
  mapOrganizationAuditActivityResponse,
  OrganizationFactory,
  organizationMembershipRepository,
  organizationReader,
  organizationTransactionRunner,
  organizationWriter,
  UpdateCustomRolesCommand,
  UpdateOrganizationSettingsCommand,
  UserFactory,
} from './support/audit_logs_test_support.js'

test.group('Admin Audit Logs - Organization Governance', (group) => {
  const ctx = configureAuditLogsTestGroup(group)

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

    const settingsResult = await ctx.makeQuery(
      makeSystemAdminActionContext(systemAdmin.id)
    ).handle({
      page: 1,
      perPage: 10,
      surface: 'organization',
      organizationId: org.id,
      action: 'organization.settings.updated',
    })
    const rolesResult = await ctx.makeQuery(
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
})
