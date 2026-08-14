import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  CurrentTaskAuthoringBundle,
  TaskResolvedBriefReader,
} from '#modules/tasks/actions/ports/outbound/task_resolved_brief_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import { deriveResolvedReadinessFindingCodes } from '#modules/tasks/domain/task-authoring/task_readiness_resolution_history'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import { assertTaskSpecificationContractIntegrity } from '#modules/tasks/infra/adapters/task-authoring/task_contract_integrity'
import {
  mapTaskContractVersionModel,
  mapTaskReadinessAssessmentModel,
  mapTaskSpecificationVersionModel,
  mapTaskSupportingReferenceModel,
} from '#modules/tasks/infra/adapters/task-authoring/task_contract_model_mapper'
import TaskReadinessAssessment from '#modules/tasks/infra/models/task-authoring/task_readiness_assessment'
import TaskSpecificationContractRepository from '#modules/tasks/infra/repositories/task-authoring/task_specification_contract_repository'

export class LucidTaskResolvedBriefReader implements TaskResolvedBriefReader {
  private readonly hasher = new NodeTaskContractContentHasher()

  async readCurrentBundle(
    taskId: string,
    transaction?: TaskTransaction
  ): Promise<CurrentTaskAuthoringBundle | null> {
    const current = await TaskSpecificationContractRepository.findCurrent(
      taskId,
      transaction as TransactionClientContract | undefined
    )
    if (!current) return null
    if (!current.latestReadinessAssessment) {
      throw new InvariantViolationException(
        'Current Task authoring head is missing its immutable readiness assessment'
      )
    }

    const readinessHistoryQuery = transaction
      ? TaskReadinessAssessment.query({ client: transaction as TransactionClientContract })
      : TaskReadinessAssessment.query()
    const readinessHistory = await readinessHistoryQuery
      .where('task_id', taskId)
      .orderBy('assessed_at', 'asc')
      .orderBy('id', 'asc')
    const currentAssessmentIndex = readinessHistory.findIndex(
      (assessment) => assessment.id === current.latestReadinessAssessment?.id
    )
    if (currentAssessmentIndex < 0) {
      throw new InvariantViolationException(
        'Current Task authoring head readiness assessment is absent from immutable history'
      )
    }
    const assessmentsThroughCurrent = readinessHistory.slice(0, currentAssessmentIndex + 1)
    const readiness = mapTaskReadinessAssessmentModel(current.latestReadinessAssessment)

    const bundle = {
      headRevision: current.head.revision,
      specification: mapTaskSpecificationVersionModel(current.specification),
      contract: current.contract ? mapTaskContractVersionModel(current.contract) : null,
      workFieldProvenance: current.contract?.resolution_provenance ?? null,
      supportingReferences: current.supportingReferences.map(mapTaskSupportingReferenceModel),
      readiness,
      readinessFindingCodesResolved: deriveResolvedReadinessFindingCodes({
        historical: assessmentsThroughCurrent.map(mapTaskReadinessAssessmentModel),
        current: readiness,
      }),
    }
    assertTaskSpecificationContractIntegrity({
      expectedTaskId: taskId,
      specification: bundle.specification,
      contract: bundle.contract,
      supportingReferences: bundle.supportingReferences,
      readiness: bundle.readiness,
      hasher: this.hasher,
    })

    return bundle
  }
}
