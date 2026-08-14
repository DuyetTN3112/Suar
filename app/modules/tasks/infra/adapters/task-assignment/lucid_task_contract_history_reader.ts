import type {
  HistoricalTaskContractBundle,
  TaskContractHistoryReader,
} from '#modules/tasks/actions/ports/outbound/task_contract_history_reader'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'
import { assertTaskSpecificationContractIntegrity } from '#modules/tasks/infra/adapters/task-authoring/task_contract_integrity'
import {
  mapTaskContractVersionModel,
  mapTaskSpecificationVersionModel,
} from '#modules/tasks/infra/adapters/task-authoring/task_contract_model_mapper'
import TaskContractVersion from '#modules/tasks/infra/models/task-authoring/task_contract_version'
import TaskSpecificationVersion from '#modules/tasks/infra/models/task-authoring/task_specification_version'

export class LucidTaskContractHistoryReader implements TaskContractHistoryReader {
  private readonly hasher = new NodeTaskContractContentHasher()

  async readHistoricalBundle(input: {
    taskId: string
    specificationVersionId: string
    contractVersionId: string
  }): Promise<HistoricalTaskContractBundle | null> {
    const [specification, contract] = await Promise.all([
      TaskSpecificationVersion.query()
        .where('id', input.specificationVersionId)
        .where('task_id', input.taskId)
        .first(),
      TaskContractVersion.query()
        .where('id', input.contractVersionId)
        .where('task_id', input.taskId)
        .where('task_specification_version_id', input.specificationVersionId)
        .first(),
    ])
    if (!specification || !contract) return null
    const bundle = {
      specification: mapTaskSpecificationVersionModel(specification),
      contract: mapTaskContractVersionModel(contract),
      workFieldProvenance: contract.resolution_provenance,
    }
    assertTaskSpecificationContractIntegrity({
      expectedTaskId: input.taskId,
      specification: bundle.specification,
      contract: bundle.contract,
      hasher: this.hasher,
    })

    return bundle
  }
}
