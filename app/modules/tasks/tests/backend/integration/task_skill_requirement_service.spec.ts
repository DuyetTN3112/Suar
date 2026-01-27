import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  addTaskRequirementCommand,
  updateTaskRequirementCommand,
} from '#composition/task_application_composition'
import {
  taskExternalDeps,
  taskRequiredSkillPersistence,
} from '#composition/task_external_dependencies_composition'
import { persistTaskRequiredSkills } from '#modules/tasks/actions/commands/internal/create_task_transaction'
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
  minimum_level_id: string | null
  target_level_id: string | null
  assessment_ceiling_level_id: string | null
  rubric_version_id: string | null
  required_public_proficiency_code: string
}

interface CustomSkillRow {
  id: string
  category_code: string
}

async function createTestLevelSet(): Promise<{
  scaleId: string
  minimumLevelId: string
  targetLevelId: string
  ceilingLevelId: string
}> {
  const scaleId = testId()
  const minimumLevelId = testId()
  const targetLevelId = testId()
  const ceilingLevelId = testId()

  await db.table('proficiency_scales').insert({
    id: scaleId,
    code: `task-skill-requirement-${scaleId.slice(0, 8)}`,
    name: 'Task Skill Requirement Test Scale',
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

  return { scaleId, minimumLevelId, targetLevelId, ceilingLevelId }
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

    const created = await addTaskRequirementCommand.execute({
      taskId: task.id,
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

  test('addRequirement persists distinct semantic levels and rubric binding', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const skill = await SkillFactory.create()
    const { minimumLevelId, targetLevelId, ceilingLevelId } = await createTestLevelSet()
    const rubricVersionId = testId()

    await db.table('skill_rubric_versions').insert({
      id: rubricVersionId,
      skill_id: skill.id,
      version: 1,
      status: 'draft',
      created_by: owner.id,
      change_summary: 'Semantic binding regression',
    })

    const created = await addTaskRequirementCommand.execute({
      taskId: task.id,
      skillId: skill.id,
      minimumLevelId,
      targetLevelId,
      assessmentCeilingLevelId: ceilingLevelId,
      rubricVersionId,
      isMandatory: true,
      importance: 'critical',
      weight: 3,
    })

    const persisted = (await db
      .from('task_required_skills')
      .where('id', created.id)
      .first()) as TaskRequiredSkillRow | null

    assert.isDefined(persisted)
    assert.equal(persisted?.minimum_level_id, minimumLevelId)
    assert.equal(persisted?.target_level_id, targetLevelId)
    assert.equal(persisted?.assessment_ceiling_level_id, ceilingLevelId)
    assert.equal(persisted?.rubric_version_id, rubricVersionId)
    assert.equal(persisted?.required_public_proficiency_code, 'l4')
    assert.equal(persisted?.importance, 'critical')
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
        taskExternalDeps.skill,
        taskRequiredSkillPersistence.resolver,
        taskRequiredSkillPersistence.writer
      )
    })

    const customSkill = (await db
      .from('skills')
      .where('skill_name', 'GraphQL Federation')
      .first()) as CustomSkillRow | null
    const persisted = customSkill
      ? ((await db
          .from('task_required_skills')
          .where('task_id', task.id)
          .where('skill_id', customSkill.id)
          .first()) as TaskRequiredSkillRow | null)
      : null

    assert.isDefined(customSkill)
    assert.equal(customSkill?.category_code, 'technology')
    assert.isDefined(persisted)
  })

  test('task creation persistence preserves semantic level split and rubric version', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const skill = await SkillFactory.create({ category_code: 'technology' })
    const engineeringSkill = await SkillFactory.create({ category_code: 'engineering' })
    const softSkill = await SkillFactory.create({ category_code: 'soft_skill' })
    const deliverySkill = await SkillFactory.create({ category_code: 'delivery' })
    const { minimumLevelId, targetLevelId, ceilingLevelId } = await createTestLevelSet()
    const rubricVersionId = testId()

    await db.table('skill_rubric_versions').insert({
      id: rubricVersionId,
      skill_id: skill.id,
      version: 1,
      status: 'published',
      created_by: owner.id,
      change_summary: 'Published semantic binding regression',
    })

    await db.transaction(async (trx) => {
      await persistTaskRequiredSkills(
        task.id,
        [
          {
            id: skill.id,
            level: 'l10',
            minimum_level_id: minimumLevelId,
            target_level_id: targetLevelId,
            assessment_ceiling_level_id: ceilingLevelId,
            rubric_version_id: rubricVersionId,
            importance: 'high',
            weight: 2,
          },
          { id: engineeringSkill.id, level: 'l4' },
          { id: softSkill.id, level: 'l4' },
          { id: deliverySkill.id, level: 'l4' },
        ],
        trx,
        taskExternalDeps.skill,
        taskRequiredSkillPersistence.resolver,
        taskRequiredSkillPersistence.writer
      )
    })

    const persisted = (await db
      .from('task_required_skills')
      .where('task_id', task.id)
      .where('skill_id', skill.id)
      .first()) as TaskRequiredSkillRow | null

    assert.isDefined(persisted)
    assert.equal(persisted?.minimum_level_id, minimumLevelId)
    assert.equal(persisted?.target_level_id, targetLevelId)
    assert.equal(persisted?.assessment_ceiling_level_id, ceilingLevelId)
    assert.equal(persisted?.rubric_version_id, rubricVersionId)
    assert.equal(persisted?.required_public_proficiency_code, 'l10')
    assert.equal(persisted?.importance, 'high')
    assert.equal(Number(persisted?.weight), 2)
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
        addTaskRequirementCommand.execute({
          taskId: task.id,
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

    const updated = await updateTaskRequirementCommand.execute({
      requirementId,
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
