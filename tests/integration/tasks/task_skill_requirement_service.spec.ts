import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  SkillFactory,
  TaskFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

interface TaskRequiredSkillRow {
  skill_id: string
  task_id: string
  is_mandatory: boolean
  importance: string
  weight: string | number | null
  requirement_notes: string | null
}

test.group('Integration | Task Skill Requirement Service', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('addRequirement persists a semantic task skill requirement row', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const skill = await SkillFactory.create()

    const created = await TaskSkillRequirementService.addRequirement(task.id, {
      skillId: skill.id,
      isMandatory: false,
      importance: 'high',
      weight: 2.5,
      requirementNotes: 'Marketplace task requires proven depth',
    })

    const persisted = (await db
      .from('task_required_skills')
      .where('id', created.id)
      .first()) as TaskRequiredSkillRow | null

    assert.isDefined(persisted)
    assert.equal(persisted?.skill_id, skill.id)
    assert.equal(persisted?.task_id, task.id)
    assert.equal(persisted?.is_mandatory, false)
    assert.equal(persisted?.importance, 'high')
    assert.equal(Number(persisted?.weight), 2.5)
    assert.equal(persisted?.requirement_notes, 'Marketplace task requires proven depth')
  })

  test('updateRequirement updates an existing requirement without relying on a missing updated_at column', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const skill = await SkillFactory.create()
    const requirementId = testId()

    await db.table('task_required_skills').insert({
      id: requirementId,
      task_id: task.id,
      skill_id: skill.id,
      required_level_code: 'middle',
      is_mandatory: false,
      importance: 'medium',
      weight: 1,
      requirement_source: 'manual',
      requirement_notes: null,
    })

    const updated = await TaskSkillRequirementService.updateRequirement(requirementId, {
      importance: 'critical',
      weight: 3,
      requirementNotes: 'Updated after task calibration',
    })

    const persisted = (await db
      .from('task_required_skills')
      .where('id', requirementId)
      .first()) as TaskRequiredSkillRow | null

    assert.equal(updated.id, requirementId)
    assert.equal(updated.importance, 'critical')
    assert.equal(updated.weight, 3)
    assert.equal(updated.requirement_notes, 'Updated after task calibration')
    assert.equal(persisted?.importance, 'critical')
    assert.equal(Number(persisted?.weight), 3)
    assert.equal(persisted?.requirement_notes, 'Updated after task calibration')
  })
})
