import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import AddTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/add_task_requirement_command'
import PrefillTaskRequirementsFromRoleCommand from '#modules/tasks/actions/commands/task-requirements/prefill_task_requirements_from_role_command'
import RemoveTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/remove_task_requirement_command'
import UpdateTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/update_task_requirement_command'
import { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  TaskRequirementReader,
  TaskRequirementWriter,
} from '#modules/tasks/actions/ports/outbound/task_requirement_repository'
import type {
  TaskTransaction,
  TaskTransactionRunner,
} from '#modules/tasks/actions/ports/outbound/task_transaction'

const input = {
  taskId: 'task-1',
  skillId: 'skill-1',
}

class UnusedSkillReader extends TaskSkillReader {
  listActiveSkills() {
    return Promise.reject(new Error('unused'))
  }
  listProjectTaskSkills() {
    return Promise.reject(new Error('unused'))
  }
  listActiveProficiencyLevels() {
    return Promise.reject(new Error('unused'))
  }
  findActiveSkillIds() {
    return Promise.reject(new Error('unused'))
  }
  findSkillSummariesByIds() {
    return Promise.reject(new Error('unused'))
  }
  resolveSkillIdsByCategoryCodes() {
    return Promise.reject(new Error('unused'))
  }
  findTaskRequirementReferenceFacts() {
    return Promise.reject(new Error('unused'))
  }
  findProficiencyLevelsByIds() {
    return Promise.reject(new Error('unused'))
  }
  findProficiencyLevelById() {
    return Promise.reject(new Error('unused'))
  }
  findRubricVersion() {
    return Promise.reject(new Error('unused'))
  }
  findProjectRole() {
    return Promise.resolve(null)
  }
}

function requirementReader(overrides: Partial<TaskRequirementReader> = {}): TaskRequirementReader {
  return {
    findById: () => Promise.resolve(null),
    findByTaskAndSkill: () => Promise.resolve(null),
    findByTask: () => Promise.resolve([]),
    findVersionById: () => Promise.resolve(null),
    findLatestVersionByTask: () => Promise.resolve(null),
    findVersionsByTask: () => Promise.resolve([]),
    findVersionItems: () => Promise.resolve([]),
    ...overrides,
  }
}

const requirementWriter: TaskRequirementWriter = {
  create: () => Promise.reject(new Error('unused')),
  update: () => Promise.reject(new Error('unused')),
  remove: () => Promise.reject(new Error('unused')),
  createVersion: () => Promise.reject(new Error('unused')),
  createVersionItems: () => Promise.reject(new Error('unused')),
}

const transactionRunner: TaskTransactionRunner = {
  run<T>(callback: (transaction: TaskTransaction) => Promise<T>): Promise<T> {
    return callback({})
  },
}

test.group('Task requirement Result boundaries', () => {
  test('rejects the removed role-to-task skill prefill path', async ({ assert }) => {
    const command = new PrefillTaskRequirementsFromRoleCommand(
      requirementReader(),
      requirementWriter,
      new UnusedSkillReader(),
      transactionRunner
    )

    const result = await command.executeAndWrap({
      taskId: 'task-1',
      projectProfessionalRoleId: 'role-1',
    })

    assert.isTrue(result.isFailure())
    assert.isTrue(result.getError() instanceof ValidationException)
    assert.isTrue(typeof command.execute === 'function')
  })

  test('wraps AddTaskRequirementCommand application failures and preserves execute', async ({
    assert,
  }) => {
    const failure = new ConflictException('Skill already required in this task')
    const command = new AddTaskRequirementCommand(
      requirementReader({ findByTaskAndSkill: () => Promise.reject(failure) }),
      requirementWriter,
      new UnusedSkillReader(),
      transactionRunner
    )

    const result = await command.executeAndWrap(input)

    assert.isTrue(result.isFailure())
    assert.strictEqual(result.getError(), failure)
    assert.isTrue(typeof command.execute === 'function')
  })

  test('wraps UpdateTaskRequirementCommand application failures and preserves execute', async ({
    assert,
  }) => {
    const failure = new NotFoundException('Task skill requirement not found')
    const command = new UpdateTaskRequirementCommand(
      requirementReader(),
      requirementWriter,
      new UnusedSkillReader(),
      transactionRunner
    )

    const result = await command.executeAndWrap({ requirementId: 'requirement-1' })
    const error = result.getError()

    assert.isTrue(result.isFailure())
    assert.isTrue(error instanceof Error)
    assert.equal(error.message, failure.message)
    assert.isTrue(typeof command.execute === 'function')
  })

  test('wraps RemoveTaskRequirementCommand application failures and preserves execute', async ({
    assert,
  }) => {
    const failure = new NotFoundException('Task skill requirement not found')
    const command = new RemoveTaskRequirementCommand(
      requirementReader(),
      requirementWriter,
      new UnusedSkillReader(),
      transactionRunner
    )

    const result = await command.executeAndWrap('requirement-1')
    const error = result.getError()

    assert.isTrue(result.isFailure())
    assert.isTrue(error instanceof Error)
    assert.equal(error.message, failure.message)
    assert.isTrue(typeof command.execute === 'function')
  })

  test('rethrows unexpected command errors from executeAndWrap', async ({ assert }) => {
    const unexpected = new Error('database connection lost')
    const command = new RemoveTaskRequirementCommand(
      requirementReader(),
      requirementWriter,
      new UnusedSkillReader(),
      {
        run: () => Promise.reject(unexpected),
      }
    )

    let thrown: unknown
    try {
      await command.executeAndWrap('requirement-1')
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, unexpected)
  })
})
