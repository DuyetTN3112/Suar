import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { TaskSkillReaderAdapter } from '#composition/adapters/task_skill_reader_adapter'
import { taskSearchDocumentReader } from '#composition/task_external_dependencies_composition'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { TaskSkillSummary } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { LucidTaskSearchDocumentReader } from '#modules/tasks/infra/adapters/lucid_task_search_document_reader'
import Task from '#modules/tasks/infra/models/task'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  SkillFactory,
  TaskFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

class CountingTaskSkillReader extends TaskSkillReaderAdapter {
  readonly requestedSkillIdBatches: string[][] = []

  constructor(
    private readonly transform: (skills: TaskSkillSummary[]) => TaskSkillSummary[] = (skills) =>
      skills
  ) {
    super()
  }

  override async findSkillSummariesByIds(skillIds: string[]): Promise<TaskSkillSummary[]> {
    this.requestedSkillIdBatches.push(skillIds)
    return this.transform(await super.findSkillSummariesByIds(skillIds))
  }
}

test.group('Integration | Task Search Document Reader', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('preserves requirement order and duplicates when bulk skill facts arrive reversed', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Search boundary task',
    })
    const activeSkill = await SkillFactory.create({
      skill_name: 'TypeScript',
      is_active: true,
    })
    const inactiveSkill = await SkillFactory.create({
      skill_name: 'Legacy Systems',
      is_active: false,
    })

    task.required_skills_rel = [
      {
        skill_id: activeSkill.id,
      },
      {
        skill_id: inactiveSkill.id,
      },
      {
        skill_id: activeSkill.id,
      },
    ] as typeof task.required_skills_rel

    const originalTaskQuery = Task.query.bind(Task) as typeof Task.query
    const fakeTaskQuery = {
      where: () => fakeTaskQuery,
      preload: () => fakeTaskQuery,
      firstOrFail: () => Promise.resolve(task),
    }
    Task.query = (() => fakeTaskQuery) as unknown as typeof Task.query

    const skillReader = new CountingTaskSkillReader((skills) => skills.reverse())
    const reader = new LucidTaskSearchDocumentReader(skillReader)

    try {
      const record = await reader.findTaskSearchDocumentRecord(task.id)

      assert.lengthOf(skillReader.requestedSkillIdBatches, 1)
      assert.deepEqual(skillReader.requestedSkillIdBatches[0], [
        activeSkill.id,
        inactiveSkill.id,
      ])
      assert.deepEqual(record.requiredSkills, [
        { skillId: activeSkill.id, skillName: 'TypeScript' },
        { skillId: inactiveSkill.id, skillName: 'Legacy Systems' },
        { skillId: activeSkill.id, skillName: 'TypeScript' },
      ])

      const composedRecord = await taskSearchDocumentReader.findTaskSearchDocumentRecord(task.id)
      assert.deepEqual(composedRecord.requiredSkills, record.requiredSkills)
    } finally {
      Task.query = originalTaskQuery
    }
  })

  test('rejects a partial search document when a required skill fact is missing', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Incomplete search boundary task',
    })
    const availableSkill = await SkillFactory.create({
      skill_name: 'Available Skill',
      is_active: true,
    })
    const missingSkill = await SkillFactory.create({
      skill_name: 'Missing Skill',
      is_active: true,
    })

    await db.table('task_required_skills').insert([
      {
        id: testId(),
        task_id: task.id,
        skill_id: availableSkill.id,
        required_public_proficiency_code: 'l7',
        is_mandatory: true,
        importance: 'high',
        weight: 2,
        requirement_source: 'manual',
        requirement_notes: null,
      },
      {
        id: testId(),
        task_id: task.id,
        skill_id: missingSkill.id,
        required_public_proficiency_code: 'l5',
        is_mandatory: false,
        importance: 'medium',
        weight: 1,
        requirement_source: 'manual',
        requirement_notes: null,
      },
    ])

    const skillReader = new CountingTaskSkillReader((skills) =>
      skills.filter((skill) => skill.skillId !== missingSkill.id)
    )
    const reader = new LucidTaskSearchDocumentReader(skillReader)

    let thrown: unknown
    try {
      await reader.findTaskSearchDocumentRecord(task.id)
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, InvariantViolationException)
    assert.match((thrown as Error).message, new RegExp(`missing required skill facts.*${missingSkill.id}`))
    assert.lengthOf(skillReader.requestedSkillIdBatches, 1)
    assert.sameMembers(skillReader.requestedSkillIdBatches[0] ?? [], [
      availableSkill.id,
      missingSkill.id,
    ])
  })
})
