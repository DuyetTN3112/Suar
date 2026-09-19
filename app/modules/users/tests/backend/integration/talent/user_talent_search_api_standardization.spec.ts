import { test } from '@japa/runner'

import { buildRecruiterScenario } from '../support/user_marketplace_test_fixtures.js'

import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_catalog'
import { TaskRequirementRepository } from '#modules/tasks/infra/repositories/task-requirements/task_requirement_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  SkillFactory,
  TaskFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'


test.group('Integration | User talent search API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('talent search API returns wrapped camelCase list without success envelope', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const response = await client
      .get('/api/talents/search')
      .qs({ q: talent.username })
      .loginAs(recruiter)

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        username: string
        trustScore: number
        avatarUrl: string | null
        customHeadline: string | null
        completedTasks: number
      }>
    }

    assert.notProperty(body, 'success')
    assert.isArray(body.data)
    assert.isAbove(body.data.length, 0)

    const first = body.data[0]
    assert.exists(first)
    assert.property(first ?? {}, 'trustScore')
    assert.property(first ?? {}, 'avatarUrl')
    assert.property(first ?? {}, 'customHeadline')
    assert.property(first ?? {}, 'completedTasks')
    assert.notProperty(first ?? {}, 'trust_score')

    const found = body.data.find((item) => item.id === talent.id)
    assert.exists(found)
    assert.equal(found?.username, talent.username)
    assert.equal(found?.trustScore, 88)
    assert.equal(found?.customHeadline, 'Searchable talent')
  })

  test('canonical v1 talent search API preserves legacy contract shape', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const response = await client
      .get('/api/v1/talents/search')
      .qs({ q: talent.username })
      .loginAs(recruiter)

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        username: string
        trustScore: number
        avatarUrl: string | null
        customHeadline: string | null
        completedTasks: number
      }>
    }

    assert.notProperty(body, 'success')
    const found = body.data.find((item) => item.id === talent.id)
    assert.exists(found)
    assert.equal(found?.username, talent.username)
    assert.equal(found?.trustScore, 88)
    assert.equal(found?.customHeadline, 'Searchable talent')
    assert.notProperty(found ?? {}, 'trust_score')
  })

  test('canonical v1 org talent search API preserves legacy contract shape', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const response = await client
      .get('/api/v1/me/organizations/current/talents/search')
      .qs({ q: talent.username })
      .loginAs(recruiter)

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        username: string
        trustScore: number
        customHeadline: string | null
      }>
    }

    assert.notProperty(body, 'success')
    const found = body.data.find((item) => item.id === talent.id)
    assert.exists(found)
    assert.equal(found?.username, talent.username)
    assert.equal(found?.trustScore, 88)
    assert.equal(found?.customHeadline, 'Searchable talent')
  })

  test('canonical v1 org talent search API denies regular org members', async ({ client }) => {
    const { org } = await buildRecruiterScenario()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const response = await client
      .get('/api/v1/me/organizations/current/talents/search')
      .loginAs(member)

    response.assertStatus(403)
  })

  test('canonical v1 org talent detail API denies regular org members', async ({ client }) => {
    const { org, talent } = await buildRecruiterScenario()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const response = await client
      .get(`/api/v1/me/organizations/current/talents/${talent.id}`)
      .loginAs(member)

    response.assertStatus(403)
  })

  test('canonical v1 org talent detail API denies cross-org recruiters without leaking profile data', async ({
    assert,
    client,
  }) => {
    const { talent } = await buildRecruiterScenario()
    const { org: otherOrg, owner: outsiderRecruiter } = await OrganizationFactory.createWithOwner()
    await outsiderRecruiter.merge({ current_organization_id: otherOrg.id }).save()

    const response = await client
      .get(`/api/v1/me/organizations/current/talents/${talent.id}`)
      .loginAs(outsiderRecruiter)

    response.assertStatus(403)
    const responseText = response.text()
    assert.notInclude(responseText, talent.id)
    if (talent.email) {
      assert.notInclude(responseText, talent.email)
    }
    assert.notInclude(responseText, 'Searchable talent')
    assert.notInclude(responseText, 'E_INTERNAL_ERROR')
  })

  test('talent search API accepts camelCase taskId query input', async ({ assert, client }) => {
    const { org, recruiter, talent } = await buildRecruiterScenario()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: recruiter.id,
    })
    const skill = await SkillFactory.create({ skill_name: 'Task Match Skill' })

    await TaskRequirementRepository.createMany([
      {
        task_id: task.id,
        skill_id: skill.id,
        required_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
        is_mandatory: true,
        weight: 3,
        importance: 'critical',
      },
    ])

    await UserSkillFactory.create({
      user_id: talent.id,
      skill_id: skill.id,
      verified_public_proficiency_code: getCanonicalProficiencyLevelValue('senior', 'l10'),
    })

    const response = await client
      .get('/api/talents/search')
      .qs({ taskId: task.id })
      .loginAs(recruiter)

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
      }>
    }

    assert.include(
      body.data.map((item) => item.id),
      talent.id
    )
  })
})
