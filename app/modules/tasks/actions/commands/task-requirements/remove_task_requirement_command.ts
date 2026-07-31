import AppException from '#modules/errors/public_contracts/application_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  TaskRequirementReader,
  TaskRequirementWriter,
} from '#modules/tasks/actions/ports/outbound/task_requirement_repository'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'
import {
  countTaskRequiredSkillCategories,
  formatTaskRequiredSkillCategoryViolations,
  getTaskRequiredSkillCategoryViolations,
} from '#modules/tasks/domain/task-requirements/task_required_skill_category_rules'

export default class RemoveTaskRequirementCommand {
  constructor(
    private readonly requirements: TaskRequirementReader,
    private readonly requirementWriter: TaskRequirementWriter,
    private readonly skills: TaskSkillReader,
    private readonly transactions: TaskTransactionRunner
  ) {}

  async execute(requirementId: string): Promise<void> {
    await this.transactions.run(async (transaction) => {
      const requirement = await this.requirements.findById(requirementId, transaction)
      if (!requirement) {
        throw new NotFoundException('Task skill requirement not found')
      }

      const taskRequirements = await this.requirements.findByTask(requirement.task_id, transaction)
      const remaining = taskRequirements.filter((candidate) => candidate.id !== requirement.id)
      const skillIds = [...new Set(remaining.map((candidate) => candidate.skill_id))]
      const referenceFacts = await this.skills.findTaskRequirementReferenceFacts({
        skillIds,
        proficiencyLevelIds: [],
      })
      const categoryBySkillId = new Map(
        referenceFacts.skills.map((skill) => [skill.id, skill.categoryCode])
      )
      const missingSkillIds = skillIds.filter((skillId) => !categoryBySkillId.has(skillId))
      if (missingSkillIds.length > 0) {
        throw new ValidationException(
          `Task requirements reference missing skills: ${missingSkillIds.join(', ')}`
        )
      }

      const violations = getTaskRequiredSkillCategoryViolations(
        countTaskRequiredSkillCategories(
          remaining.map((candidate) => categoryBySkillId.get(candidate.skill_id))
        )
      )
      if (violations.length > 0) {
        throw new ValidationException(formatTaskRequiredSkillCategoryViolations(violations))
      }

      await this.requirementWriter.remove(requirementId, transaction)
    })
  }

  async executeAndWrap(requirementId: string): Promise<Result<void, AppException>> {
    try {
      return Result.ok(await this.execute(requirementId))
    } catch (error) {
      if (error instanceof AppException) {
        return Result.fail(error)
      }

      throw error
    }
  }
}
