import { test } from '@japa/runner'

import {
  OrganizationRole,
  OrganizationUserStatus,
} from '#modules/organizations/constants/organization_constants'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Contract | Organization API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('legacy and v1 organization detail endpoints share canonical camelCase response shape', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner({
      name: 'Canonical Organization',
    })
    const member = await UserFactory.create({ username: 'org_detail_member' })

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const legacyResponse = await client.get(`/api/organizations/${org.id}`).loginAs(owner)
    const v1Response = await client.get(`/api/v1/organizations/${org.id}`).loginAs(owner)

    legacyResponse.assertStatus(200)
    v1Response.assertStatus(200)
    assert.equal(legacyResponse.header('deprecation'), 'true')
    assert.equal(legacyResponse.header('sunset'), '2026-12-31')
    assert.equal(
      legacyResponse.header('link'),
      `</api/v1/organizations/${org.id}>; rel="successor-version"`
    )
    assert.isUndefined(v1Response.header('deprecation'))

    const legacyBody = legacyResponse.body() as {
      data: {
        id: string
        name: string
        slug: string
        description: string | null
        website: string | null
        ownerId: string
        owner?: { id: string; email: string }
        stats?: {
          memberCount: number
          projectCount: number
          taskCount: number
        }
        membersPreview?: Array<{
          id: string
          email: string | null
          orgRole: string
          joinedAt: string
        }>
      }
    }
    const v1Body = v1Response.body() as typeof legacyBody

    assert.deepEqual(v1Body, legacyBody)
    assert.properties(legacyBody.data, [
      'id',
      'name',
      'slug',
      'description',
      'website',
      'ownerId',
      'createdAt',
      'updatedAt',
      'owner',
      'stats',
      'membersPreview',
    ])
    assert.notProperty(legacyBody.data, 'owner_id')
    assert.notProperty(legacyBody.data, 'created_at')

    assert.deepInclude(legacyBody.data.owner ?? {}, {
      id: owner.id,
      email: owner.email,
    })
    assert.deepInclude(legacyBody.data.stats ?? {}, {
      memberCount: 2,
      projectCount: 0,
      taskCount: 0,
    })

    const previewMember = legacyBody.data.membersPreview?.find((entry) => entry.id === member.id)
    if (!previewMember) {
      throw new Error('Expected membersPreview to include approved organization member')
    }

    assert.deepInclude(previewMember, {
      id: member.id,
      email: member.email,
      orgRole: OrganizationRole.MEMBER,
    })
    assert.notProperty(previewMember, 'org_role')
    assert.notProperty(previewMember, 'joined_at')
  })

  test('legacy and v1 organization update endpoints share canonical wrapped data shape', async ({
    assert,
    client,
  }) => {
    const { org: legacyOrg, owner: legacyOwner } = await OrganizationFactory.createWithOwner({
      name: 'Legacy Organization',
    })
    const { org: v1Org, owner: v1Owner } = await OrganizationFactory.createWithOwner({
      name: 'V1 Organization',
    })

    const payload = {
      name: 'Updated Organization',
      description: 'Canonical organization body',
      website: 'https://updated-org.example.com',
    }

    const legacyResponse = await client
      .put(`/api/organizations/${legacyOrg.id}`)
      .json(payload)
      .loginAs(legacyOwner)
    const v1Response = await client
      .patch(`/api/v1/organizations/${v1Org.id}`)
      .json(payload)
      .loginAs(v1Owner)

    legacyResponse.assertStatus(200)
    v1Response.assertStatus(200)
    assert.equal(legacyResponse.header('deprecation'), 'true')
    assert.equal(
      legacyResponse.header('link'),
      `</api/v1/organizations/${legacyOrg.id}>; rel="successor-version"`
    )
    assert.isUndefined(v1Response.header('deprecation'))

    const legacyBody = legacyResponse.body() as {
      data: {
        id: string
        name: string
        description: string | null
        website: string | null
        ownerId: string
      }
    }
    const v1Body = v1Response.body() as typeof legacyBody

    assert.sameMembers(Object.keys(v1Body.data), Object.keys(legacyBody.data))
    assert.equal(legacyBody.data.id, legacyOrg.id)
    assert.equal(v1Body.data.id, v1Org.id)
    assert.equal(legacyBody.data.name, payload.name)
    assert.equal(v1Body.data.name, payload.name)
    assert.equal(legacyBody.data.description, payload.description)
    assert.equal(v1Body.data.description, payload.description)
    assert.equal(legacyBody.data.website, payload.website)
    assert.equal(v1Body.data.website, payload.website)
    assert.notProperty(legacyBody.data, 'owner_id')
  }).timeout(10000)

  test('legacy organization PATCH alias preserves canonical update contract', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner({
      name: 'Legacy Patch Organization',
    })

    const payload = {
      name: 'Legacy Patch Updated Organization',
      description: 'PATCH alias on compat organization route',
      website: 'https://legacy-patch-org.example.com',
    }

    const response = await client.patch(`/api/organizations/${org.id}`).json(payload).loginAs(owner)

    response.assertStatus(200)
    assert.equal(response.header('deprecation'), 'true')
    assert.equal(
      response.header('link'),
      `</api/v1/organizations/${org.id}>; rel="successor-version"`
    )

    const body = response.body() as {
      data: {
        id: string
        name: string
        description: string | null
        website: string | null
        ownerId: string
      }
    }

    assert.equal(body.data.id, org.id)
    assert.equal(body.data.name, payload.name)
    assert.equal(body.data.description, payload.description)
    assert.equal(body.data.website, payload.website)
    assert.property(body.data, 'ownerId')
    assert.notProperty(body.data, 'owner_id')
  }).timeout(10000)

  test('legacy and v1 organization delete endpoints both return 204', async ({
    assert,
    client,
  }) => {
    const { org: legacyOrg, owner: legacyOwner } = await OrganizationFactory.createWithOwner({
      name: 'Legacy Delete Organization',
    })
    const { org: v1Org, owner: v1Owner } = await OrganizationFactory.createWithOwner({
      name: 'V1 Delete Organization',
    })

    const legacyResponse = await client
      .delete(`/api/organizations/${legacyOrg.id}`)
      .loginAs(legacyOwner)
    const v1Response = await client
      .delete(`/api/v1/organizations/${v1Org.id}`)
      .loginAs(v1Owner)

    legacyResponse.assertStatus(204)
    v1Response.assertStatus(204)
    assert.equal(legacyResponse.header('deprecation'), 'true')
    assert.equal(
      legacyResponse.header('link'),
      `</api/v1/organizations/${legacyOrg.id}>; rel="successor-version"`
    )
    assert.isUndefined(v1Response.header('deprecation'))
  }).timeout(10000)

  test('organization members endpoints prefer nested collection paths while preserving deprecated aliases', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner({
      name: 'Organization Members Canonical Path',
    })
    const member = await UserFactory.create({
      username: 'org_members_alias_member',
      email: 'org-members-alias@example.com',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: OrganizationRole.MEMBER,
      status: OrganizationUserStatus.APPROVED,
    })

    const canonicalResponse = await client
      .get(`/api/v1/organizations/${org.id}/members`)
      .loginAs(owner)
    canonicalResponse.assertStatus(200)
    assert.isUndefined(canonicalResponse.header('deprecation'))

    const aliasResponse = await client
      .get(`/api/v1/organization-members/${org.id}`)
      .loginAs(owner)
    aliasResponse.assertStatus(200)
    assert.equal(aliasResponse.header('deprecation'), 'true')
    assert.equal(
      aliasResponse.header('link'),
      '</api/v1/organizations/:organizationId/members>; rel="successor-version"'
    )

    const canonicalBody = canonicalResponse.body() as {
      data: {
        organization: {
          id: string
        }
        members: Array<{
          id: string
          user: {
            id: string
            email: string | null
          }
        }>
      }
    }
    const aliasBody = aliasResponse.body() as typeof canonicalBody

    assert.deepEqual(aliasBody, canonicalBody)
    assert.equal(canonicalBody.data.organization.id, org.id)
    assert.exists(canonicalBody.data.members.find((entry) => entry.user.id === member.id))
  })
})
