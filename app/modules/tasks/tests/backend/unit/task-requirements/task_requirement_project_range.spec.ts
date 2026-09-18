import { test } from '@japa/runner'

import AddTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/add_task_requirement_command'
import type {
  TaskProjectSkillOption,
  TaskProficiencyLevelDetail,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  CreateTaskRequirementRecord,
  TaskRequirementReader,
  TaskRequirementRecord,
  TaskRequirementWriter,
} from '#modules/tasks/actions/ports/outbound/task_requirement_repository'
import type {
  TaskTransaction,
  TaskTransactionRunner,
} from '#modules/tasks/actions/ports/outbound/task_transaction'

const levels: TaskProficiencyLevelDetail[] = [
  { id: 'l1', code: 'l1', ordinal: 1, scaleId: 'scale-1' },
  { id: 'l2', code: 'l2', ordinal: 2, scaleId: 'scale-1' },
  { id: 'l6', code: 'l6', ordinal: 6, scaleId: 'scale-1' },
  { id: 'l10', code: 'l10', ordinal: 10, scaleId: 'scale-1' },
  { id: 'l11', code: 'l11', ordinal: 11, scaleId: 'scale-1' },
]

const projectSkills: TaskProjectSkillOption[] = [
  {
    id: 'skill-svelte',
    projectSkillId: 'project-skill-svelte',
    name: 'Svelte',
    categoryCode: 'technology',
    rubricVersionId: null,
    minimumTaskRequirementLevelId: 'l2',
    maximumTaskRequirementLevelId: 'l10',
    minimumTaskRequirementLevelCode: 'l2',
    maximumTaskRequirementLevelCode: 'l10',
    isActive: true,
    isSelectableForTasks: true,
  },
]

class ProjectRangeSkillReader extends TaskSkillReader {
  listActiveSkills() {
    return Promise.resolve([])
  }

  listProjectTaskSkills() {
    return Promise.resolve(projectSkills)
  }

  listActiveProficiencyLevels() {
    return Promise.resolve([])
  }

  findActiveSkillIds() {
    return Promise.resolve([])
  }

  findSkillSummariesByIds() {
    return Promise.resolve([])
  }

  resolveSkillIdsByCategoryCodes() {
    return Promise.resolve([])
  }

  findTaskRequirementReferenceFacts() {
    return Promise.resolve({ skills: [], proficiencyLevels: [] })
  }

  findProficiencyLevelsByIds(ids: string[]) {
    return Promise.resolve(levels.filter((level) => ids.includes(level.id)))
  }

  findProficiencyLevelById(id: string) {
    return Promise.resolve(levels.find((level) => level.id === id) ?? null)
  }

  findRubricVersion() {
    return Promise.resolve(null)
  }

  findProjectRole() {
    return Promise.resolve(null)
  }
}

const requirements: TaskRequirementReader = {
  findTaskProjectId: () => Promise.resolve('project-1'),
  findById: () => Promise.resolve(null),
  findByTaskAndSkill: () => Promise.resolve(null),
  findByTask: () => Promise.resolve([]),
  findVersionById: () => Promise.resolve(null),
  findLatestVersionByTask: () => Promise.resolve(null),
  findVersionsByTask: () => Promise.resolve([]),
  findVersionItems: () => Promise.resolve([]),
}

function toRecord(input: CreateTaskRequirementRecord): TaskRequirementRecord {
  return {
    id: 'requirement-1',
    ...input,
    proficiency_level_id: null,
    created_at: null,
  }
}

const writer: TaskRequirementWriter = {
  create(input) {
    return Promise.resolve(toRecord(input))
  },
  update: () => Promise.reject(new Error('unused')),
  remove: () => Promise.reject(new Error('unused')),
  createVersion: () => Promise.reject(new Error('unused')),
  createVersionItems: () => Promise.reject(new Error('unused')),
}

const transactions: TaskTransactionRunner = {
  run<T>(callback: (transaction: TaskTransaction) => Promise<T>): Promise<T> {
    return callback({})
  },
}

function makeCommand() {
  return new AddTaskRequirementCommand(
    requirements,
    writer,
    new ProjectRangeSkillReader(),
    transactions
  )
}

test.group('Task requirement project range', () => {
  test('accepts a Task minimum inside the full Project range', async ({ assert }) => {
    const created = await makeCommand().execute({
      taskId: 'task-1',
      skillId: 'skill-svelte',
      projectSkillId: 'project-skill-svelte',
      minimumLevelId: 'l6',
    })

    assert.equal(created.minimum_level_id, 'l6')
    assert.equal(created.required_public_proficiency_code, 'l6')
    assert.isNull(created.target_level_id)
    assert.isNull(created.assessment_ceiling_level_id)
  })

  test('rejects a Task minimum above the Project maximum', async ({ assert }) => {
    await assert.rejects(
      () =>
        makeCommand().execute({
          taskId: 'task-1',
          skillId: 'skill-svelte',
          projectSkillId: 'project-skill-svelte',
          minimumLevelId: 'l11',
        }),
      /Mức tối thiểu của Task phải nằm trong khoảng level của Project/
    )
  })

  test('rejects a Task minimum below the Project minimum', async ({ assert }) => {
    await assert.rejects(
      () =>
        makeCommand().execute({
          taskId: 'task-1',
          skillId: 'skill-svelte',
          projectSkillId: 'project-skill-svelte',
          minimumLevelId: 'l1',
        }),
      /Mức tối thiểu của Task phải nằm trong khoảng level của Project/
    )
  })
})
