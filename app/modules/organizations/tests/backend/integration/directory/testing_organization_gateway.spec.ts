import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { TestingOrganizationGateway } from '#modules/organizations/infra/adapters/directory/testing_organization_gateway'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory } from '#tests/helpers/factories'

test.group('Integration | Testing organization gateway', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())

  test('ensures one organization under concurrency and publishes pure reads', async ({
    assert,
  }) => {
    const gateway = new TestingOrganizationGateway()
    const owner = await UserFactory.create()
    const replacementOwner = await UserFactory.create()
    const slug = `testing-org-gateway-${randomUUID()}`

    try {
      const input = {
        slug,
        name: 'Testing Organization Gateway',
        description: 'Initial description',
        ownerId: owner.id,
        plan: 'starter',
      }
      const [first, second] = await Promise.all([
        gateway.ensureTestingOrganizationV1(input),
        gateway.ensureTestingOrganizationV1(input),
      ])

      assert.equal(first.id, second.id)
      assert.deepEqual(Object.keys(first).sort(), ['id', 'ownerId', 'plan', 'slug'])
      assert.notProperty(first, 'serialize')
      assert.deepEqual(await gateway.findTestingOrganizationByIdV1(first.id), first)
      assert.deepEqual(await gateway.findTestingOrganizationBySlugV1(slug), first)

      const updated = await gateway.ensureTestingOrganizationV1({
        ...input,
        ownerId: replacementOwner.id,
        plan: 'professional',
      })
      assert.equal(updated.id, first.id)
      assert.equal(updated.ownerId, replacementOwner.id)
      assert.equal(updated.plan, 'professional')
      const organizationCount = (await db
        .from('organizations')
        .where('slug', slug)
        .count('* as total')
        .first()) as { total?: number | string } | undefined
      assert.equal(Number(organizationCount?.total), 1)
    } finally {
      await db
        .from('organization_users')
        .whereIn('user_id', [owner.id, replacementOwner.id])
        .delete()
      await db.from('organizations').where('slug', slug).delete()
      await db.from('users').whereIn('id', [owner.id, replacementOwner.id]).delete()
    }
  })

  test('atomically approves one membership and returns deterministic first membership', async ({
    assert,
  }) => {
    const gateway = new TestingOrganizationGateway()
    const owner = await UserFactory.create()
    const member = await UserFactory.create()
    const slug = `testing-membership-gateway-${randomUUID()}`
    let organizationId: string | null = null

    try {
      const organization = await gateway.ensureTestingOrganizationV1({
        slug,
        name: 'Testing Membership Gateway',
        ownerId: owner.id,
        plan: null,
      })
      organizationId = organization.id

      const input = {
        organizationId: organization.id,
        userId: member.id,
        role: 'org_member' as const,
        invitedBy: owner.id,
      }
      const [first, second] = await Promise.all([
        gateway.ensureApprovedMembershipV1(input),
        gateway.ensureApprovedMembershipV1(input),
      ])

      assert.deepEqual(first, second)
      assert.deepEqual(first, {
        organizationId: organization.id,
        userId: member.id,
        role: 'org_member',
        status: 'approved',
        invitedBy: owner.id,
      })
      assert.notProperty(first, 'serialize')
      assert.deepEqual(await gateway.findFirstApprovedMembershipV1(member.id), {
        organizationId: organization.id,
      })
      const membershipCount = (await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', member.id)
        .count('* as total')
        .first()) as { total?: number | string } | undefined
      assert.equal(Number(membershipCount?.total), 1)

      const promoted = await gateway.ensureApprovedMembershipV1({
        ...input,
        role: 'org_admin',
        invitedBy: null,
      })
      assert.equal(promoted.role, 'org_admin')
      assert.isNull(promoted.invitedBy)
    } finally {
      if (organizationId) {
        await db.from('organization_users').where('organization_id', organizationId).delete()
        await db.from('organizations').where('id', organizationId).delete()
      }
      await db.from('users').whereIn('id', [owner.id, member.id]).delete()
    }
  })
})
