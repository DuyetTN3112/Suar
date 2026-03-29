import { test } from '@japa/runner'

import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/proficiency_level_catalog'
import { TaskRequirementRepository } from '#modules/tasks/infra/repositories/task_requirement_repository'
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

async function buildRecruiterScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const recruiter = await UserFactory.create({
    current_organization_id: org.id,
  })
  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: recruiter.id,
    org_role: 'org_admin',
    status: 'approved',
  })

  const talent = await UserFactory.createExternalContributor({
    current_organization_id: org.id,
    email: `talent-${Date.now()}@test.example.com`,
  })
  await talent
    .merge({
      profile_settings: {
        is_searchable: true,
        show_contact_info: true,
        show_organizations: true,
        show_projects: true,
        show_spider_chart: true,
        show_technical_skills: true,
        custom_headline: 'Searchable talent',
        preferred_job_types: [],
        preferred_locations: [],
        min_salary_expectation: null,
        salary_currency: 'USD',
        available_from: null,
      },
      trust_data: {
        current_tier_code: 'gold',
        calculated_score: 88,
        raw_score: 88,
        total_verified_reviews: 1,
        last_calculated_at: null,
      },
    })
    .save()

  return { org, owner, recruiter, talent }
}

test.group('Integration | User marketplace API standardization', (group) => {
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

  test('recruiter bookmark list API returns wrapped camelCase list without success envelope', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const createResponse = await client.post('/api/recruiter-bookmarks').loginAs(recruiter).json({
      talent_user_id: talent.id,
      notes: 'Initial note',
      folder: 'Pipeline',
      rating: 4,
    })
    createResponse.assertStatus(200)

    const listResponse = await client.get('/api/recruiter-bookmarks').loginAs(recruiter)
    listResponse.assertStatus(200)

    const body = listResponse.body() as {
      data: Array<{
        id: string
        recruiterUserId: string
        talentUserId: string
        notes: string | null
        folder: string
        rating: number | null
      }>
    }

    assert.notProperty(body, 'success')
    assert.isArray(body.data)
    assert.isAbove(body.data.length, 0)

    const bookmark = body.data.find((item) => item.talentUserId === talent.id)
    assert.exists(bookmark)
    assert.equal(bookmark?.recruiterUserId, recruiter.id)
    assert.equal(bookmark?.notes, 'Initial note')
    assert.equal(bookmark?.folder, 'Pipeline')
    assert.equal(bookmark?.rating, 4)
    assert.notProperty(bookmark ?? {}, 'talent_user_id')
  })

  test('recruiter bookmark mutation APIs return wrapped camelCase data and 204 delete', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const createResponse = await client.post('/api/recruiter-bookmarks').loginAs(recruiter).json({
      talentUserId: talent.id,
      notes: 'Create note',
      folder: 'Saved',
      rating: 5,
    })
    createResponse.assertStatus(200)

    const createBody = createResponse.body() as {
      data: {
        id: string
        talentUserId: string
        recruiterUserId: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.talentUserId, talent.id)
    assert.equal(createBody.data.recruiterUserId, recruiter.id)
    assert.equal(createBody.data.notes, 'Create note')
    assert.notProperty(createBody.data, 'talent_user_id')

    const updateResponse = await client
      .patch(`/api/recruiter-bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
      .json({
        notes: 'Updated note',
        folder: 'Interview',
        rating: 3,
      })
    updateResponse.assertStatus(200)

    const updateBody = updateResponse.body() as {
      data: {
        id: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.notProperty(updateBody, 'success')
    assert.equal(updateBody.data.id, createBody.data.id)
    assert.equal(updateBody.data.notes, 'Updated note')
    assert.equal(updateBody.data.folder, 'Interview')
    assert.equal(updateBody.data.rating, 3)

    const deleteResponse = await client
      .delete(`/api/recruiter-bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
    deleteResponse.assertStatus(204)
  })

  test('canonical v1 recruiter bookmark APIs preserve legacy contract shape', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const createResponse = await client
      .post('/api/v1/recruiter-bookmarks')
      .loginAs(recruiter)
      .json({
        talentUserId: talent.id,
        notes: 'V1 note',
        folder: 'Qualified',
        rating: 5,
      })
    createResponse.assertStatus(200)

    const createBody = createResponse.body() as {
      data: {
        id: string
        talentUserId: string
        recruiterUserId: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.talentUserId, talent.id)
    assert.equal(createBody.data.recruiterUserId, recruiter.id)
    assert.equal(createBody.data.folder, 'Qualified')
    assert.notProperty(createBody.data, 'talent_user_id')

    const listResponse = await client.get('/api/v1/recruiter-bookmarks').loginAs(recruiter)
    listResponse.assertStatus(200)

    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        talentUserId: string
        folder: string
        rating: number | null
      }>
    }

    assert.notProperty(listBody, 'success')
    const bookmark = listBody.data.find((item) => item.id === createBody.data.id)
    assert.exists(bookmark)
    assert.equal(bookmark?.talentUserId, talent.id)
    assert.equal(bookmark?.folder, 'Qualified')

    const updateResponse = await client
      .patch(`/api/v1/recruiter-bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
      .json({
        notes: 'V1 updated',
        folder: 'Interview',
        rating: 4,
      })
    updateResponse.assertStatus(200)

    const updateBody = updateResponse.body() as {
      data: {
        id: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.equal(updateBody.data.id, createBody.data.id)
    assert.equal(updateBody.data.notes, 'V1 updated')
    assert.equal(updateBody.data.folder, 'Interview')
    assert.equal(updateBody.data.rating, 4)

    const deleteResponse = await client
      .delete(`/api/v1/recruiter-bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
    deleteResponse.assertStatus(204)
  })

  test('canonical v1 talent bookmark APIs expose domain-aligned route', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const createResponse = await client.post('/api/v1/talent-bookmarks').loginAs(recruiter).json({
      talentUserId: talent.id,
      notes: 'Talent bookmark note',
      folder: 'Priority',
      rating: 5,
    })
    createResponse.assertStatus(200)

    const createBody = createResponse.body() as {
      data: {
        id: string
        talentUserId: string
        recruiterUserId: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.talentUserId, talent.id)
    assert.equal(createBody.data.recruiterUserId, recruiter.id)
    assert.equal(createBody.data.notes, 'Talent bookmark note')
    assert.equal(createBody.data.folder, 'Priority')
    assert.notProperty(createBody.data, 'talent_user_id')

    const listResponse = await client.get('/api/v1/talent-bookmarks').loginAs(recruiter)
    listResponse.assertStatus(200)

    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        talentUserId: string
        folder: string
      }>
    }
    assert.exists(listBody.data.find((item) => item.id === createBody.data.id))

    const updateResponse = await client
      .patch(`/api/v1/talent-bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
      .json({
        notes: 'Updated talent note',
        folder: 'Interview',
        rating: 4,
      })
    updateResponse.assertStatus(200)

    const deleteResponse = await client
      .delete(`/api/v1/talent-bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
    deleteResponse.assertStatus(204)
  })

  test('legacy recruiters bookmark dialect remains a pure compatibility alias', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const createResponse = await client.post('/api/recruiters/bookmarks').loginAs(recruiter).json({
      talentUserId: talent.id,
      notes: 'Legacy recruiter dialect note',
      folder: 'Legacy',
      rating: 4,
    })
    createResponse.assertStatus(200)
    assert.equal(createResponse.header('deprecation'), 'true')
    assert.equal(createResponse.header('sunset'), '2026-12-31')
    assert.equal(
      createResponse.header('link'),
      '</api/v1/talent-bookmarks>; rel="successor-version"'
    )

    const createBody = createResponse.body() as {
      data: {
        id: string
        talentUserId: string
        recruiterUserId: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.talentUserId, talent.id)
    assert.equal(createBody.data.recruiterUserId, recruiter.id)
    assert.equal(createBody.data.notes, 'Legacy recruiter dialect note')
    assert.equal(createBody.data.folder, 'Legacy')
    assert.equal(createBody.data.rating, 4)

    const listResponse = await client.get('/api/recruiters/bookmarks').loginAs(recruiter)
    listResponse.assertStatus(200)
    assert.equal(listResponse.header('deprecation'), 'true')

    const listBody = listResponse.body() as {
      data: Array<{
        id: string
        talentUserId: string
        recruiterUserId: string
        notes: string | null
        folder: string
        rating: number | null
      }>
    }

    assert.notProperty(listBody, 'success')
    const bookmark = listBody.data.find((item) => item.id === createBody.data.id)
    assert.exists(bookmark)
    assert.equal(bookmark?.talentUserId, talent.id)
    assert.equal(bookmark?.recruiterUserId, recruiter.id)
    assert.equal(bookmark?.notes, 'Legacy recruiter dialect note')
    assert.equal(bookmark?.folder, 'Legacy')
    assert.equal(bookmark?.rating, 4)

    const updateResponse = await client
      .patch(`/api/recruiters/bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
      .json({
        notes: 'Legacy recruiter dialect updated',
        folder: 'Legacy updated',
        rating: 3,
      })
    updateResponse.assertStatus(200)
    assert.equal(updateResponse.header('deprecation'), 'true')

    const updateBody = updateResponse.body() as {
      data: {
        id: string
        notes: string | null
        folder: string
        rating: number | null
      }
    }

    assert.notProperty(updateBody, 'success')
    assert.equal(updateBody.data.id, createBody.data.id)
    assert.equal(updateBody.data.notes, 'Legacy recruiter dialect updated')
    assert.equal(updateBody.data.folder, 'Legacy updated')
    assert.equal(updateBody.data.rating, 3)

    const deleteResponse = await client
      .delete(`/api/recruiters/bookmarks/${createBody.data.id}`)
      .loginAs(recruiter)
    deleteResponse.assertStatus(204)
    assert.equal(deleteResponse.header('deprecation'), 'true')
  })

  test('canonical v1 org talent bookmark APIs preserve legacy contract shape', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const createResponse = await client
      .post(`/api/v1/me/organizations/current/talents/${talent.id}/bookmarks`)
      .loginAs(recruiter)
      .json({
        notes: 'Org v1 note',
        folder: 'Pipeline',
        rating: 4,
      })

    createResponse.assertStatus(200)

    const createBody = createResponse.body() as {
      data: {
        id: string
        talentUserId: string
        recruiterUserId: string
      }
    }

    assert.notProperty(createBody, 'success')
    assert.equal(createBody.data.talentUserId, talent.id)
    assert.equal(createBody.data.recruiterUserId, recruiter.id)

    const deleteResponse = await client
      .delete(`/api/v1/me/organizations/current/talents/${talent.id}/bookmarks`)
      .loginAs(recruiter)
    deleteResponse.assertStatus(204)
  })

  test('canonical v1 org talent bookmark delete missing resource uses Problem Details error contract', async ({
    assert,
    client,
  }) => {
    const { recruiter, talent } = await buildRecruiterScenario()

    const response = await client
      .delete(`/api/v1/me/organizations/current/talents/${talent.id}/bookmarks`)
      .loginAs(recruiter)

    response.assertStatus(404)
    assert.equal(response.header('content-type'), 'application/problem+json')

    const body = response.body() as {
      status: number
      detail: string
      code: string
      requestId: string
      correlationId: string
    }

    assert.equal(body.status, 404)
    assert.equal(body.detail, 'Talent bookmark not found')
    assert.equal(body.code, 'E_NOT_FOUND')
    assert.isString(body.requestId)
    assert.isString(body.correlationId)
  })
})
