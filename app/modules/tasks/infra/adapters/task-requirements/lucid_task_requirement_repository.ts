import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  CreateTaskRequirementRecord,
  CreateTaskRequirementVersionItemRecord,
  CreateTaskRequirementVersionRecord,
  TaskRequirementReader,
  TaskRequirementRecord,
  TaskRequirementVersionItemRecord,
  TaskRequirementVersionRecord,
  TaskRequirementWriter,
  UpdateTaskRequirementRecord,
} from '#modules/tasks/actions/ports/outbound/task_requirement_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type TaskRequiredSkill from '#modules/tasks/infra/models/task-requirements/task_required_skill'
import type TaskRequirementVersion from '#modules/tasks/infra/models/task-requirements/task_requirement_version'
import type TaskRequirementVersionItem from '#modules/tasks/infra/models/task-requirements/task_requirement_version_item'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import { TaskRequirementRepository } from '#modules/tasks/infra/repositories/task-requirements/task_requirement_repository'

function lucidTransaction(transaction?: TaskTransaction): TransactionClientContract | undefined {
  return transaction as TransactionClientContract | undefined
}

function toRequirementRecord(model: TaskRequiredSkill): TaskRequirementRecord {
  return {
    id: model.id,
    task_id: model.task_id,
    skill_id: model.skill_id,
    project_skill_id: model.project_skill_id,
    source_project_professional_role_id: model.source_project_professional_role_id,
    source_role_skill_id: model.source_role_skill_id,
    minimum_level_id: model.minimum_level_id,
    target_level_id: model.target_level_id,
    assessment_ceiling_level_id: model.assessment_ceiling_level_id,
    rubric_version_id: model.rubric_version_id,
    required_public_proficiency_code: model.required_public_proficiency_code,
    proficiency_level_id: model.proficiency_level_id,
    is_mandatory: model.is_mandatory,
    importance: model.importance,
    weight: model.weight,
    requirement_source: model.requirement_source,
    requirement_notes: model.requirement_notes,
    created_at: model.created_at.toISO(),
  }
}

function toVersionItemRecord(
  model: TaskRequirementVersionItem
): TaskRequirementVersionItemRecord {
  return {
    id: model.id,
    requirement_version_id: model.requirement_version_id,
    skill_id: model.skill_id,
    project_skill_id: model.project_skill_id,
    minimum_level_id: model.minimum_level_id,
    target_level_id: model.target_level_id,
    assessment_ceiling_level_id: model.assessment_ceiling_level_id,
    rubric_version_id: model.rubric_version_id,
    required_public_proficiency_code: model.required_public_proficiency_code,
    is_mandatory: model.is_mandatory,
    importance: model.importance,
    weight: model.weight,
    requirement_source: model.requirement_source,
    requirement_notes: model.requirement_notes,
    created_at: model.created_at.toISO(),
  }
}

function toVersionRecord(model: TaskRequirementVersion): TaskRequirementVersionRecord {
  return {
    id: model.id,
    task_id: model.task_id,
    version_number: model.version_number,
    reason: model.reason,
    created_by: model.created_by,
    professional_role_snapshot: model.professional_role_snapshot,
    created_at: model.created_at.toISO(),
    items: Array.isArray(model.items) ? model.items.map(toVersionItemRecord) : [],
  }
}

export class LucidTaskRequirementReader implements TaskRequirementReader {
  async findTaskProjectId(taskId: string, transaction?: TaskTransaction): Promise<string | null> {
    const query = transaction
      ? Task.query({ client: lucidTransaction(transaction) as TransactionClientContract })
      : Task.query()
    const task = await query.where('id', taskId).select('project_id').first()
    return task?.project_id ?? null
  }

  async findById(requirementId: string, transaction?: TaskTransaction) {
    const model = await TaskRequirementRepository.findById(
      requirementId,
      lucidTransaction(transaction)
    )
    return model ? toRequirementRecord(model) : null
  }

  async findByTaskAndSkill(
    taskId: string,
    skillId: string,
    transaction?: TaskTransaction
  ) {
    const model = await TaskRequirementRepository.findByTaskAndSkill(
      taskId,
      skillId,
      lucidTransaction(transaction)
    )
    return model ? toRequirementRecord(model) : null
  }

  async findByTask(taskId: string, transaction?: TaskTransaction) {
    const models = await TaskRequirementRepository.findByTask(
      taskId,
      lucidTransaction(transaction)
    )
    return models.map(toRequirementRecord)
  }

  async findVersionById(versionId: string, transaction?: TaskTransaction) {
    const model = await TaskRequirementRepository.findVersionById(
      versionId,
      true,
      lucidTransaction(transaction)
    )
    return model ? toVersionRecord(model) : null
  }

  async findLatestVersionByTask(taskId: string, transaction?: TaskTransaction) {
    const model = await TaskRequirementRepository.findLatestVersionByTask(
      taskId,
      true,
      lucidTransaction(transaction)
    )
    return model ? toVersionRecord(model) : null
  }

  async findVersionsByTask(taskId: string, transaction?: TaskTransaction) {
    const models = await TaskRequirementRepository.findVersionsByTask(
      taskId,
      lucidTransaction(transaction)
    )
    return models.map(toVersionRecord)
  }

  async findVersionItems(versionId: string, transaction?: TaskTransaction) {
    const models = await TaskRequirementRepository.findVersionItems(
      versionId,
      lucidTransaction(transaction)
    )
    return models.map(toVersionItemRecord)
  }
}

export class LucidTaskRequirementWriter implements TaskRequirementWriter {
  async create(input: CreateTaskRequirementRecord, transaction: TaskTransaction) {
    const model = await TaskRequirementRepository.create(input, lucidTransaction(transaction))
    return toRequirementRecord(model)
  }

  async update(
    requirementId: string,
    input: UpdateTaskRequirementRecord,
    transaction: TaskTransaction
  ) {
    const model = await TaskRequirementRepository.findById(
      requirementId,
      lucidTransaction(transaction)
    )
    if (!model) {
      throw new InvariantViolationException(
        `Task requirement ${requirementId} disappeared before update`,
        {
          details: { requirementId },
        }
      )
    }

    model.merge(input)
    await model.save()
    return toRequirementRecord(model)
  }

  async remove(requirementId: string, transaction: TaskTransaction): Promise<void> {
    const model = await TaskRequirementRepository.findById(
      requirementId,
      lucidTransaction(transaction)
    )
    if (!model) {
      return
    }
    await model.delete()
  }

  async createVersion(
    input: CreateTaskRequirementVersionRecord,
    transaction: TaskTransaction
  ) {
    const model = await TaskRequirementRepository.createVersion(
      input,
      lucidTransaction(transaction)
    )
    return toVersionRecord(model)
  }

  async createVersionItems(
    inputs: CreateTaskRequirementVersionItemRecord[],
    transaction: TaskTransaction
  ) {
    const models = await TaskRequirementRepository.createVersionItems(
      inputs,
      lucidTransaction(transaction)
    )
    return models.map(toVersionItemRecord)
  }
}
