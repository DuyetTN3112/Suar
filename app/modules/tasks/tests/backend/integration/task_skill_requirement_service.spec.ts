import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { persistTaskRequiredSkills } from '#modules/tasks/actions/support/task_required_skill_persistence'
import { taskExternalDeps } from '#modules/tasks/bootstrap/task_composition_root'
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

  test('task creation required skills can create and persist a custom skill name', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const engineeringSkill = await SkillFactory.create({ category_code: 'engineering' })
    const softSkill = await SkillFactory.create({ category_code: 'soft_skill' })
    const deliverySkill = await SkillFactory.create({ category_code: 'delivery' })

    await db.transaction(async (trx) => {
      await persistTaskRequiredSkills(
        task.id,
        [
          {
            id: 'custom:technology:graphql-federation',
            level: 'l4',
            custom_name: 'GraphQL Federation',
            category_code: 'technology',
          },
          { id: engineeringSkill.id, level: 'l4' },
          { id: softSkill.id, level: 'l4' },
          { id: deliverySkill.id, level: 'l4' },
        ],
        trx,
        taskExternalDeps.skill
      )
    })

    const customSkill = await db.from('skills').where('skill_name', 'GraphQL Federation').first()
    const persisted = customSkill
      ? await db
          .from('task_required_skills')
          .where('task_id', task.id)
          .where('skill_id', customSkill.id)
          .first()
      : null

    assert.isDefined(customSkill)
    assert.equal(customSkill?.category_code, 'technology')
    assert.isDefined(persisted)
  })

  test('addRequirement rejects legacy public proficiency codes at service boundary', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const skill = await SkillFactory.create()

    await assert.rejects(
      () =>
        TaskSkillRequirementService.addRequirement(task.id, {
          skillId: skill.id,
          requiredPublicProficiencyCode: 'senior',
          isMandatory: false,
        }),
      /canonical code \(l0-l14\)/
    )
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
      required_public_proficiency_code: 'l7',
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
