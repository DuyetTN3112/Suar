import { test } from '@japa/runner'

import User from '#modules/users/infra/models/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Switch context API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('switch organization API accepts camelCase and returns wrapped payload', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create()
    const primaryOrg = await OrganizationFactory.create({ owner_id: owner.id, name: 'Primary Org' })
    const secondaryOrg = await OrganizationFactory.create({
      owner_id: owner.id,
      name: 'Secondary Org',
    })

    await OrganizationUserFactory.create({
      organization_id: primaryOrg.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: secondaryOrg.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await owner.merge({ current_organization_id: primaryOrg.id }).save()

    const response = await client
      .post('/switch-organization')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        organizationId: secondaryOrg.id,
        currentPath: '/tasks',
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        message: string
        redirect: string
        organization: { id: string; name: string }
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.organization.id, secondaryOrg.id)
    assert.equal(body.data.organization.name, 'Secondary Org')
    assert.equal(body.data.redirect, '/org')

    const refreshedOwner = await User.findOrFail(owner.id)
    assert.equal(refreshedOwner.current_organization_id, secondaryOrg.id)
  })

  test('switching from member organization to owner organization redirects into org workspace', async ({
    assert,
    client,
  }) => {
    const user = await UserFactory.create()
    const memberOrg = await OrganizationFactory.create({ owner_id: user.id, name: 'Member Org' })
    const ownerOrg = await OrganizationFactory.create({ owner_id: user.id, name: 'Owner Org' })

    await OrganizationUserFactory.create({
      organization_id: memberOrg.id,
      user_id: user.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: ownerOrg.id,
      user_id: user.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await user.merge({ current_organization_id: memberOrg.id }).save()

    const response = await client
      .post('/switch-organization')
      .loginAs(user)
      .header('accept', 'application/json')
      .json({
        organizationId: ownerOrg.id,
        currentPath: '/tasks',
      })

    response.assertStatus(200)

    const body = response.body() as { data: { redirect: string } }
    assert.equal(body.data.redirect, '/org')

    const refreshedUser = await User.findOrFail(user.id)
    assert.equal(refreshedUser.current_organization_id, ownerOrg.id)
  })

  test('switching from owner organization to member organization redirects back to user workspace', async ({
    assert,
    client,
  }) => {
    const user = await UserFactory.create()
    const ownerOrg = await OrganizationFactory.create({ owner_id: user.id, name: 'Owner Org' })
    const memberOrg = await OrganizationFactory.create({ owner_id: user.id, name: 'Member Org' })

    await OrganizationUserFactory.create({
      organization_id: ownerOrg.id,
      user_id: user.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: memberOrg.id,
      user_id: user.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await user.merge({ current_organization_id: ownerOrg.id }).save()

    const response = await client
      .post('/switch-organization')
      .loginAs(user)
      .header('accept', 'application/json')
      .json({
        organizationId: memberOrg.id,
        currentPath: '/org/members',
      })

    response.assertStatus(200)

    const body = response.body() as { data: { redirect: string } }
    assert.equal(body.data.redirect, '/projects')

    const refreshedUser = await User.findOrFail(user.id)
    assert.equal(refreshedUser.current_organization_id, memberOrg.id)
  })

  test('canonical v1 me organization switch preserves wrapped payload and mutation behavior', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create()
    const primaryOrg = await OrganizationFactory.create({ owner_id: owner.id, name: 'Primary Org V1' })
    const secondaryOrg = await OrganizationFactory.create({
      owner_id: owner.id,
      name: 'Secondary Org V1',
    })

    await OrganizationUserFactory.create({
      organization_id: primaryOrg.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: secondaryOrg.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await owner.merge({ current_organization_id: primaryOrg.id }).save()

    const response = await client
      .post('/api/v1/me/organizations/switch')
      .loginAs(owner)
      .json({
        organizationId: secondaryOrg.id,
        currentPath: '/tasks',
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        message: string
        redirect: string
        organization: { id: string; name: string }
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.organization.id, secondaryOrg.id)
    assert.equal(body.data.organization.name, 'Secondary Org V1')
    assert.equal(body.data.redirect, '/org')

    const refreshedOwner = await User.findOrFail(owner.id)
    assert.equal(refreshedOwner.current_organization_id, secondaryOrg.id)
  })

  test('switch organization API rejects foreign organizations and leaves current org unchanged', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create()
    const primaryOrg = await OrganizationFactory.create({ owner_id: owner.id, name: 'Owned Org' })
    const foreignOrg = await OrganizationFactory.create({ name: 'Foreign Org' })

    await OrganizationUserFactory.create({
      organization_id: primaryOrg.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await owner.merge({ current_organization_id: primaryOrg.id }).save()

    const response = await client
      .post('/switch-organization')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        organizationId: foreignOrg.id,
        currentPath: '/tasks',
      })

    response.assertStatus(403)

    const refreshedOwner = await User.findOrFail(owner.id)
    assert.equal(refreshedOwner.current_organization_id, primaryOrg.id)
  })

  test('organization route switch JSON path returns wrapped payload using route param', async ({
    assert,
    client,
  }) => {
    const owner = await UserFactory.create()
    const primaryOrg = await OrganizationFactory.create({ owner_id: owner.id, name: 'Alpha Org' })
    const secondaryOrg = await OrganizationFactory.create({ owner_id: owner.id, name: 'Beta Org' })

    await OrganizationUserFactory.create({
      organization_id: primaryOrg.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: secondaryOrg.id,
      user_id: owner.id,
      org_role: 'org_owner',
      status: 'approved',
    })
    await owner.merge({ current_organization_id: primaryOrg.id }).save()

    const response = await client
      .post(`/organizations/${secondaryOrg.id}/switch`)
      .loginAs(owner)
      .header('accept', 'application/json')

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        message: string
        redirect: string
        organization: { id: string; name: string }
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.organization.id, secondaryOrg.id)
    assert.equal(body.data.redirect, '/org')
  })

  test('switch project API accepts camelCase and returns wrapped payload', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner({ name: 'Project Org' })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: 'Switch Target Project',
    })

    const response = await client
      .post('/switch-project')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        projectId: project.id,
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        message: string
        redirect: string
        project: { id: string; name: string }
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.project.id, project.id)
    assert.equal(body.data.project.name, 'Switch Target Project')
    assert.equal(body.data.redirect, `/projects/${project.id}/tasks`)
  })

  test('canonical v1 me project switch preserves wrapped payload contract', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner({ name: 'Project Org V1' })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: 'Switch Target Project V1',
    })

    const response = await client
      .post('/api/v1/me/projects/switch')
      .loginAs(owner)
      .json({
        projectId: project.id,
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        message: string
        redirect: string
        project: { id: string; name: string }
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.project.id, project.id)
    assert.equal(body.data.project.name, 'Switch Target Project V1')
    assert.equal(body.data.redirect, `/projects/${project.id}/tasks`)
  })
})
