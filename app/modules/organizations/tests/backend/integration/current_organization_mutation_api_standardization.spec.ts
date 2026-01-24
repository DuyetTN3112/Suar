import { test } from '@japa/runner'

import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/access/public_contracts/organization_constants'
import OrganizationUser from '#modules/organizations/members/infra/models/organization_user'
import Project from '#modules/projects/infra/models/project'
import TaskStatus from '#modules/tasks/infra/models/task_status'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

test.group('Integration | Current organization mutation API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('invite member JSON path returns 204 and creates pending invited membership', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const invitee = await UserFactory.create({ email: 'org-mutation-invitee@example.com' })

    const response = await client
      .post('/org/members/invite')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        email: invitee.email,
        roleId: OrganizationRole.ADMIN,
      })

    response.assertStatus(204)

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', invitee.id)
      .first()

    assert.isNotNull(membership)
    assert.equal(membership?.status, OrganizationUserStatus.PENDING)
    assert.equal(membership?.invited_by, owner.id)
    assert.equal(membership?.org_role, OrganizationRole.ADMIN)
  })

  test('canonical v1 invite member JSON path preserves legacy mutation behavior', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const invitee = await UserFactory.create({ email: 'org-mutation-invitee-v1@example.com' })

    const response = await client
      .post('/api/v1/me/organizations/current/member-invitations')
      .loginAs(owner)
      .json({
        email: invitee.email,
        roleId: OrganizationRole.ADMIN,
      })

    response.assertStatus(204)

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', invitee.id)
      .first()

    assert.isNotNull(membership)
    assert.equal(membership?.status, OrganizationUserStatus.PENDING)
    assert.equal(membership?.invited_by, owner.id)
    assert.equal(membership?.org_role, OrganizationRole.ADMIN)
  })

  test('remove member JSON path returns 204 and deletes membership', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const response = await client
      .delete(`/org/members/${member.id}`)
      .loginAs(owner)
      .header('accept', 'application/json')

    response.assertStatus(204)

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', member.id)
      .first()

    assert.isNull(membership)
  })

  test('canonical v1 remove member JSON path preserves 204 contract and deletes membership', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const response = await client
      .delete(`/api/v1/me/organizations/current/members/${member.id}`)
      .loginAs(owner)

    response.assertStatus(204)

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', member.id)
      .first()

    assert.isNull(membership)
  })

  test('update member role JSON path returns 204 and persists new role', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const response = await client
      .put(`/org/members/${member.id}/role`)
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        roleId: OrganizationRole.ADMIN,
      })

    response.assertStatus(204)

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', member.id)
      .firstOrFail()

    assert.equal(membership.org_role, OrganizationRole.ADMIN)
  })

  test('canonical v1 update member role JSON path preserves 204 contract and persists new role', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const response = await client
      .put(`/api/v1/me/organizations/current/members/${member.id}/role`)
      .loginAs(owner)
      .json({
        roleId: OrganizationRole.ADMIN,
      })

    response.assertStatus(204)

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', member.id)
      .firstOrFail()

    assert.equal(membership.org_role, OrganizationRole.ADMIN)
  })

  test('approve join request JSON path returns 204 and marks membership approved', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const requester = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: requester.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
      invited_by: null,
    })

    const response = await client
      .put(`/org/invitations/requests/${requester.id}/approve`)
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        action: 'approve',
      })

    response.assertStatus(204)

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', requester.id)
      .firstOrFail()

    assert.equal(membership.status, OrganizationUserStatus.APPROVED)
  })

  test('canonical v1 approve join request JSON path preserves 204 contract and marks membership approved', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const requester = await UserFactory.create()

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: requester.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.PENDING,
      invited_by: null,
    })

    const response = await client
      .put(`/api/v1/me/organizations/current/join-requests/${requester.id}/approve`)
      .loginAs(owner)
      .json({
        action: 'approve',
      })

    response.assertStatus(204)

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', requester.id)
      .firstOrFail()

    assert.equal(membership.status, OrganizationUserStatus.APPROVED)
  })

  test('bulk add members JSON path returns 204 and adds every selected user', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const first = await UserFactory.create({ email: 'org-bulk-add-1@example.com' })
    const second = await UserFactory.create({ email: 'org-bulk-add-2@example.com' })

    const response = await client
      .post('/org/members/add')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        userIds: [first.id, second.id],
      })

    response.assertStatus(204)

    const memberships = await OrganizationUser.query()
      .where('organization_id', org.id)
      .whereIn('user_id', [first.id, second.id])
      .orderBy('user_id', 'asc')

    assert.lengthOf(memberships, 2)
    assert.sameDeepMembers(
      memberships.map((membership) => ({
        userId: membership.user_id,
        status: membership.status,
        invitedBy: membership.invited_by,
      })),
      [
        { userId: first.id, status: OrganizationUserStatus.APPROVED, invitedBy: owner.id },
        { userId: second.id, status: OrganizationUserStatus.APPROVED, invitedBy: owner.id },
      ]
    )
  })

  test('canonical v1 bulk add members JSON path preserves 204 contract', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const first = await UserFactory.create({ email: 'org-bulk-add-v1-1@example.com' })

    const response = await client
      .post('/api/v1/me/organizations/current/members/add')
      .loginAs(owner)
      .json({
        userIds: [first.id],
      })

    response.assertStatus(204)

    const membership = await OrganizationUser.query()
      .where('organization_id', org.id)
      .where('user_id', first.id)
      .first()

    assert.isNotNull(membership)
    assert.equal(membership?.status, OrganizationUserStatus.APPROVED)
    assert.equal(membership?.invited_by, owner.id)
  })

  test('update roles JSON path returns 204 without legacy success envelope', async ({
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const response = await client
      .put('/org/roles')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        customRoles: [
          {
            name: 'org_reviewer',
            description: 'Review task disputes',
            permissions: ['reviews.disputes.respond'],
          },
        ],
      })

    response.assertStatus(204)
  })

  test('create project JSON path returns wrapped camelCase payload without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const response = await client
      .post('/org/projects')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        name: 'Org API standardization project',
        description: 'Create project via JSON path',
        status: 'pending',
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        id: string
        organizationId: string
        name: string
        createdAt: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.organizationId, org.id)
    assert.equal(body.data.name, 'Org API standardization project')
    assert.isString(body.data.id)
    assert.property(body.data, 'createdAt')

    const createdProject = await Project.query().where('id', body.data.id).first()
    assert.isNotNull(createdProject)
    assert.equal(createdProject?.organization_id, org.id)
  })

  test('canonical v1 create project JSON path preserves wrapped camelCase payload contract', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const response = await client
      .post('/api/v1/me/organizations/current/projects')
      .loginAs(owner)
      .json({
        name: 'Org V1 API standardization project',
        description: 'Create project via canonical JSON path',
        status: 'pending',
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        id: string
        organizationId: string
        name: string
        createdAt: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.organizationId, org.id)
    assert.equal(body.data.name, 'Org V1 API standardization project')
    assert.isString(body.data.id)
    assert.property(body.data, 'createdAt')
  })

  test('create workflow status JSON path returns wrapped camelCase payload without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const response = await client
      .post('/org/workflow/statuses')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        name: 'QA Ready',
        group: 'in_progress',
        color: '#123456',
        sortOrder: 77,
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        id: string
        organizationId: string
        name: string
        sortOrder: number | null
        isDefault: boolean
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.organizationId, org.id)
    assert.equal(body.data.name, 'QA Ready')
    assert.equal(body.data.sortOrder, 77)
    assert.isFalse(body.data.isDefault)

    const createdStatus = await TaskStatus.query().where('id', body.data.id).first()
    assert.isNotNull(createdStatus)
    assert.equal(createdStatus?.organization_id, org.id)
    assert.equal(createdStatus?.sort_order, 77)
  })

  test('canonical v1 create workflow status JSON path preserves wrapped camelCase payload contract', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const response = await client
      .post('/api/v1/me/organizations/current/task-statuses')
      .loginAs(owner)
      .json({
        name: 'QA Ready V1',
        group: 'in_progress',
        color: '#654321',
        sortOrder: 79,
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        id: string
        organizationId: string
        name: string
        sortOrder: number | null
        isDefault: boolean
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.organizationId, org.id)
    assert.equal(body.data.name, 'QA Ready V1')
    assert.equal(body.data.sortOrder, 79)
    assert.isFalse(body.data.isDefault)
  })
})
