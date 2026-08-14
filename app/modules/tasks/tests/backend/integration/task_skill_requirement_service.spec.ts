import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  addTaskRequirementCommand,
  updateTaskRequirementCommand,
} from '#composition/tasks/task-application/task_application_composition'
import {
  taskExternalDeps,
  taskRequiredSkillPersistence,
} from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import { persistTaskRequiredSkills } from '#modules/tasks/actions/commands/task-authoring/internal/create_task_transaction'
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
  project_skill_id: string | null
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

interface ProficiencyLevelRow {
  id: string
  code: string
}

async function canonicalLevelIds(...codes: string[]): Promise<Record<string, string>> {
  const rows = (await db
    .from('proficiency_levels')
    .whereIn('code', codes)
    .select('id', 'code')) as ProficiencyLevelRow[]
  const ids = Object.fromEntries(rows.map((row) => [row.code, row.id]))
  for (const code of codes) {
    if (!ids[code]) throw new Error(`Missing canonical proficiency level ${code}`)
  }
  return ids
}

async function createTaskSkillScenario(
  options: { minimumCode?: string; maximumCode?: string } = {}
) {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
  })
  const skill = await SkillFactory.create({ category_code: 'technology' })
  const levelIds = await canonicalLevelIds(
    options.minimumCode ?? 'l4',
    options.maximumCode ?? 'l10'
  )
  const projectSkillId = testId()
  await db.table('project_skills').insert({
    id: projectSkillId,
    project_id: task.project_id,
    skill_id: skill.id,
    display_name_override: null,
    description_override: null,
    rubric_version_id: null,
    minimum_task_requirement_level_id: levelIds[options.minimumCode ?? 'l4'],
    maximum_task_requirement_level_id: levelIds[options.maximumCode ?? 'l10'],
    is_active: true,
    is_selectable_for_tasks: true,
    is_visible_in_project: true,
    added_by: owner.id,
  })
  return { org, owner, task, skill, projectSkillId, levelIds }
}

test.group('Integration | Task Skill Requirement Service', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('persists a Task minimum tied to the configured Project skill and never writes profile bounds', async ({
    assert,
  }) => {
    const { task, skill, projectSkillId, levelIds } = await createTaskSkillScenario()

    const created = await addTaskRequirementCommand.execute({
      taskId: task.id,
      skillId: skill.id,
      projectSkillId,
      minimumLevelId: levelIds.l4,
      isMandatory: true,
      importance: 'high',
      weight: 2.5,
      requirementNotes: 'Marketplace task requires proven depth',
    })
    const persisted = (await db
      .from('task_required_skills')
      .where('id', created.id)
      .first()) as TaskRequiredSkillRow | null

    assert.equal(persisted?.task_id, task.id)
    assert.equal(persisted?.skill_id, skill.id)
    assert.equal(persisted?.project_skill_id, projectSkillId)
    assert.equal(persisted?.minimum_level_id, levelIds.l4)
    assert.equal(persisted?.required_public_proficiency_code, 'l4')
    assert.isNull(persisted?.target_level_id)
    assert.isNull(persisted?.assessment_ceiling_level_id)
    assert.equal(Number(persisted?.weight), 2.5)

    const invalidation = (await db
      .from('search_projection_entity_revisions')
      .where('entity_type', 'task')
      .where('entity_id', task.id)
      .where('operation', 'upsert')
      .first()) as { id: string } | undefined
    assert.isDefined(invalidation)
  })

  test('rejects a missing Project skill, a missing minimum, and profile target or ceiling fields', async ({
    assert,
  }) => {
    const { task, skill, projectSkillId, levelIds } = await createTaskSkillScenario()

    await assert.rejects(
      () => addTaskRequirementCommand.execute({ taskId: task.id, skillId: skill.id, minimumLevelId: levelIds.l4 }),
      /danh mục kỹ năng của Project/
    )
    await assert.rejects(
      () => addTaskRequirementCommand.execute({ taskId: task.id, skillId: skill.id, projectSkillId }),
      /phải có mức tối thiểu/
    )
    await assert.rejects(
      () =>
        addTaskRequirementCommand.execute({
          taskId: task.id,
          skillId: skill.id,
          projectSkillId,
          minimumLevelId: levelIds.l4,
          targetLevelId: levelIds.l10,
        }),
      /không được đặt mục tiêu hoặc trần đánh giá/
    )
  })

  test('rejects a Task minimum outside the inclusive Project range', async ({ assert }) => {
    const { task, skill, projectSkillId } = await createTaskSkillScenario()
    const levels = await canonicalLevelIds('l2', 'l11')

    await assert.rejects(
      () =>
        addTaskRequirementCommand.execute({
          taskId: task.id,
          skillId: skill.id,
          projectSkillId,
          minimumLevelId: levels.l2,
        }),
      /phải nằm trong khoảng level của Project/
    )
    await assert.rejects(
      () =>
        addTaskRequirementCommand.execute({
          taskId: task.id,
          skillId: skill.id,
          projectSkillId,
          minimumLevelId: levels.l11,
        }),
      /phải nằm trong khoảng level của Project/
    )
  })

  test('task creation persists the canonical minimum only after validating the Project range', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({ organization_id: org.id, creator_id: owner.id })
    const skill = await SkillFactory.create({ category_code: 'technology' })
    const levelIds = await canonicalLevelIds('l4', 'l6', 'l10')
    const projectSkillId = testId()
    await db.table('project_skills').insert({
      id: projectSkillId,
      project_id: task.project_id,
      skill_id: skill.id,
      display_name_override: null,
      description_override: null,
      rubric_version_id: null,
      minimum_task_requirement_level_id: levelIds.l4,
      maximum_task_requirement_level_id: levelIds.l10,
      is_active: true,
      is_selectable_for_tasks: true,
      is_visible_in_project: true,
      added_by: owner.id,
    })

    await db.transaction(async (trx) => {
      await persistTaskRequiredSkills(
        task.id,
        task.project_id,
        [{ id: skill.id, project_skill_id: projectSkillId, level: 'l6' }],
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

    assert.equal(persisted?.minimum_level_id, levelIds.l6)
    assert.equal(persisted?.required_public_proficiency_code, 'l6')
    assert.isNull(persisted?.target_level_id)
    assert.isNull(persisted?.assessment_ceiling_level_id)
  })

  test('task creation rejects custom or out-of-Project skills before writing', async ({ assert }) => {
    const { task, skill, projectSkillId } = await createTaskSkillScenario()

    await assert.rejects(
      () =>
        db.transaction((trx) =>
          persistTaskRequiredSkills(
            task.id,
            task.project_id,
            [{ id: skill.id, level: 'l4' }],
            trx,
            taskExternalDeps.skill,
            taskRequiredSkillPersistence.resolver,
            taskRequiredSkillPersistence.writer
          )
        ),
      /phải thuộc danh mục kỹ năng của Project/
    )
    await assert.rejects(
      () =>
        db.transaction((trx) =>
          persistTaskRequiredSkills(
            task.id,
            task.project_id,
            [
              {
                id: 'custom:technology:graphql-federation',
                project_skill_id: projectSkillId,
                level: 'l4',
                custom_name: 'GraphQL Federation',
                category_code: 'technology',
              },
            ],
            trx,
            taskExternalDeps.skill,
            taskRequiredSkillPersistence.resolver,
            taskRequiredSkillPersistence.writer
          )
        ),
      /phải được cấu hình tại Project/
    )
    assert.lengthOf(await db.from('task_required_skills').where('task_id', task.id), 0)
  })

  test('update keeps the Project minimum contract and clears legacy target and ceiling values', async ({
    assert,
  }) => {
    const { task, skill, projectSkillId, levelIds } = await createTaskSkillScenario()
    const levelIdsForUpdate = await canonicalLevelIds('l6')
    const l6 = levelIdsForUpdate.l6
    const requirementId = testId()
    await db.table('task_required_skills').insert({
      id: requirementId,
      task_id: task.id,
      skill_id: skill.id,
      project_skill_id: projectSkillId,
      required_public_proficiency_code: 'l4',
      minimum_level_id: levelIds.l4,
      target_level_id: l6,
      assessment_ceiling_level_id: levelIds.l10,
      is_mandatory: true,
      importance: 'medium',
      weight: 1,
      requirement_source: 'manual',
      requirement_notes: null,
    })

    const updated = await updateTaskRequirementCommand.execute({
      requirementId,
      minimumLevelId: l6,
      importance: 'critical',
      weight: 3,
      requirementNotes: 'Updated after task calibration',
    })
    const persisted = (await db
      .from('task_required_skills')
      .where('id', requirementId)
      .first()) as TaskRequiredSkillRow | null

    assert.equal(updated.importance, 'critical')
    assert.equal(persisted?.minimum_level_id, l6)
    assert.equal(persisted?.required_public_proficiency_code, 'l6')
    assert.isNull(persisted?.target_level_id)
    assert.isNull(persisted?.assessment_ceiling_level_id)
    assert.equal(Number(persisted?.weight), 3)
  })
})
