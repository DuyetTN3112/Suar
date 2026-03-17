import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  SkillFactory,
  TaskFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

interface RequirementApiBody {
  data: {
    id: string
    rubricVersionId: string | null
  }
}

async function createLevelSet() {
  const scaleId = testId()
  const minimumLevelId = testId()
  const targetLevelId = testId()
  const ceilingLevelId = testId()

  await db.table('proficiency_scales').insert({
    id: scaleId,
    code: `task-req-api-${scaleId.slice(0, 8)}`,
    name: 'Task Requirement API Scale',
    version: 1,
    is_active: true,
  })

  await db.table('proficiency_levels').insert([
    {
      id: minimumLevelId,
      scale_id: scaleId,
      ordinal: 4,
      code: `l4-${minimumLevelId.slice(0, 8)}`,
      display_name: 'Minimum',
      short_name: 'Min',
      normalized_value: 0.25,
      sort_order: 4,
    },
    {
      id: targetLevelId,
      scale_id: scaleId,
      ordinal: 8,
      code: `l8-${targetLevelId.slice(0, 8)}`,
      display_name: 'Target',
      short_name: 'Target',
      normalized_value: 0.55,
      sort_order: 8,
    },
    {
      id: ceilingLevelId,
      scale_id: scaleId,
      ordinal: 11,
      code: `l11-${ceilingLevelId.slice(0, 8)}`,
      display_name: 'Ceiling',
      short_name: 'Ceiling',
      normalized_value: 0.75,
      sort_order: 11,
    },
  ])

  return { minimumLevelId, targetLevelId, ceilingLevelId }
}

test.group('Integration | Task requirement rubric API', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('add and update requirement endpoints persist rubricVersionId', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const skill = await SkillFactory.create()
    const { minimumLevelId, targetLevelId, ceilingLevelId } = await createLevelSet()
    const firstRubricVersionId = testId()
    const secondRubricVersionId = testId()

    await db.table('skill_rubric_versions').insert([
      {
        id: firstRubricVersionId,
        skill_id: skill.id,
        version: 1,
        status: 'published',
        created_by: owner.id,
        change_summary: 'Initial task API rubric',
      },
      {
        id: secondRubricVersionId,
        skill_id: skill.id,
        version: 2,
        status: 'draft',
        created_by: owner.id,
        change_summary: 'Updated task API rubric',
      },
    ])

    const createResponse = await client
      .post(`/api/v1/tasks/${task.id}/requirements`)
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        skillId: skill.id,
        minimumLevelId,
        targetLevelId,
        assessmentCeilingLevelId: ceilingLevelId,
        rubricVersionId: firstRubricVersionId,
        isMandatory: true,
      })

    createResponse.assertStatus(201)
    const created = createResponse.body() as RequirementApiBody
    assert.equal(created.data.rubricVersionId, firstRubricVersionId)

    const updateResponse = await client
      .put(`/api/v1/tasks/${task.id}/requirements/${created.data.id}`)
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({ rubricVersionId: secondRubricVersionId })

    updateResponse.assertStatus(200)
    const updated = updateResponse.body() as RequirementApiBody
    assert.equal(updated.data.rubricVersionId, secondRubricVersionId)

    const persisted = (await db
      .from('task_required_skills')
      .where('id', created.data.id)
      .select('rubric_version_id')
      .first()) as { rubric_version_id: string | null } | null

    assert.equal(persisted?.rubric_version_id, secondRubricVersionId)
  })
})
