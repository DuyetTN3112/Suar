import type { TaskRequirementProjection } from '#modules/tasks/actions/dtos/response/task_requirement_projection'
import {
  collectTaskRequirementReferenceIds,
  mapTaskRequirementProjections,
} from '#modules/tasks/actions/mapper/task_requirement_projection_mapper'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskRequirementProjectionReader } from '#modules/tasks/actions/ports/outbound/task_requirement_projection_reader'

export default class ListTaskRequirementProjectionsQuery {
  constructor(
    private readonly requirementReader: TaskRequirementProjectionReader,
    private readonly skillReader: TaskSkillReader
  ) {}

  async handle(taskId: string): Promise<TaskRequirementProjection[]> {
    const requirements = await this.requirementReader.findByTask(taskId)
    if (requirements.length === 0) {
      return []
    }

    const references = await this.skillReader.findTaskRequirementReferenceFacts(
      collectTaskRequirementReferenceIds(requirements)
    )
    return mapTaskRequirementProjections(requirements, references)
  }
}
