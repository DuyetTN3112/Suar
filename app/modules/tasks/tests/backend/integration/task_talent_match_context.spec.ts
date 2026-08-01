import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { taskFactSourceReader } from '#composition/task_external_dependencies_composition'
import FindTaskTalentMatchContextV1Query from '#modules/tasks/actions/queries/find_task_talent_match_context_v1_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  SkillFactory,
  TaskFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Task Talent Match Context', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('resolves exact task id/title with org scope and excludes skill names', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const otherOrg = await OrganizationFactory.create({ owner_id: owner.id })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Exact Talent Match Task',
    })
    const firstSkill = await SkillFactory.create({ skill_name: 'Private Skill Name' })
    const secondSkill = await SkillFactory.create({ skill_name: 'Another Private Skill' })

    await db
      .from('tasks')
      .where('id', task.id)
      .update({
        business_domain: 'fintech',
        problem_category: 'compliance',
        task_type: 'api_design',
      })
    await db.table('task_required_skills').insert([
      {
        id: testId(),
        task_id: task.id,
        skill_id: firstSkill.id,
        required_public_proficiency_code: 'l5',
        is_mandatory: true,
        importance: 'high',
        weight: 2,
        minimum_level_id: null,
        target_level_id: null,
        assessment_ceiling_level_id: null,
        project_skill_id: null,
        rubric_version_id: null,
      },
      {
        id: testId(),
        task_id: task.id,
        skill_id: secondSkill.id,
        required_public_proficiency_code: 'l3',
        is_mandatory: false,
        importance: 'medium',
        weight: 1,
        minimum_level_id: null,
        target_level_id: null,
        assessment_ceiling_level_id: null,
        project_skill_id: null,
        rubric_version_id: null,
      },
    ])

    const query = new FindTaskTalentMatchContextV1Query(taskFactSourceReader)
    const byTitle = await query.execute(
      '  exact talent match task ',
      org.id
    )
    const expectedRequirements = [
      {
        skillId: firstSkill.id,
        requiredPublicProficiencyCode: 'l5',
        isMandatory: true,
        minimumLevelId: null,
        targetLevelId: null,
        assessmentCeilingLevelId: null,
        importance: 'high',
        weight: 2,
        projectSkillId: null,
        rubricVersionId: null,
      },
      {
        skillId: secondSkill.id,
        requiredPublicProficiencyCode: 'l3',
        isMandatory: false,
        minimumLevelId: null,
        targetLevelId: null,
        assessmentCeilingLevelId: null,
        importance: 'medium',
        weight: 1,
        projectSkillId: null,
        rubricVersionId: null,
      },
    ].sort((left, right) => left.skillId.localeCompare(right.skillId))

    assert.equal(byTitle?.taskId, task.id)
    assert.equal(byTitle?.businessDomain, 'fintech')
    assert.equal(byTitle?.problemCategory, 'compliance')
    assert.equal(byTitle?.taskType, 'api_design')
    assert.deepEqual(
      [...(byTitle?.requiredSkills ?? [])].sort((left, right) =>
        left.skillId.localeCompare(right.skillId)
      ),
      expectedRequirements
    )
    assert.notInclude(JSON.stringify(byTitle), 'Private Skill Name')
    const byId = await query.execute(task.id, org.id)
    assert.deepEqual(
      [...(byId?.requiredSkills ?? [])].sort((left, right) =>
        left.skillId.localeCompare(right.skillId)
      ),
      expectedRequirements
    )
    const withoutOrganizationScope = await query.execute(
      task.id.toUpperCase(),
      null
    )
    assert.equal(withoutOrganizationScope?.taskId, task.id)
    assert.isNull(await query.execute(task.id, otherOrg.id))
    assert.isNull(await query.execute('missing-task', org.id))

    await db.from('tasks').where('id', task.id).update({ deleted_at: db.raw('NOW()') })
    assert.isNull(await query.execute(task.id, org.id))
  })

  test('fails closed for invalid or missing lookup scope', async ({ assert }) => {
    const query = new FindTaskTalentMatchContextV1Query(taskFactSourceReader)
    assert.isNull(await query.execute('', testId()))
    assert.isNull(await query.execute('some task', 'not-a-uuid'))
  })
})
