import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type {
  TaskRequirementReader,
  TaskRequirementWriter,
} from '#modules/tasks/actions/ports/outbound/task_requirement_repository'
import type { TaskTransactionRunner } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface PrefillTaskRequirementsFromRoleInput {
  taskId: string
  projectProfessionalRoleId: string
}

export interface PrefillTaskRequirementsFromRoleResult {
  addedCount: number
  skippedCount: number
}

export default class PrefillTaskRequirementsFromRoleCommand {
  constructor(
    _requirements: TaskRequirementReader,
    _requirementWriter: TaskRequirementWriter,
    _skills: TaskSkillReader,
    _transactions: TaskTransactionRunner
  ) {}

  async executeAndWrap(
    input: PrefillTaskRequirementsFromRoleInput
  ): Promise<Result<PrefillTaskRequirementsFromRoleResult, AppException>> {
    try {
      return Result.ok(await this.execute(input))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  async execute(
    _input: PrefillTaskRequirementsFromRoleInput
  ): Promise<PrefillTaskRequirementsFromRoleResult> {
    throw new ValidationException(
      'Vai trò chỉ dùng để lọc người phù hợp; không tự thêm kỹ năng hoặc mức yêu cầu vào Task'
    )
  }
}
