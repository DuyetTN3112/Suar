import { BaseQuery } from '#modules/tasks/actions/base_query'
import type { TaskRequirementProjection } from '#modules/tasks/actions/dtos/response/task_requirement_projection'
import {
  collectTaskRequirementReferenceIds,
  mapTaskRequirementProjections,
} from '#modules/tasks/actions/mappers/task-requirements/task_requirement_projection_mapper'
import type { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskRequirementProjectionReader } from '#modules/tasks/actions/ports/outbound/task_requirement_projection_reader'

type ListTaskRequirementProjectionsInput = { taskId: string }

export default class ListTaskRequirementProjectionsQuery extends BaseQuery<
  ListTaskRequirementProjectionsInput,
  TaskRequirementProjection[]
> {
  constructor(
    private readonly requirementReader: TaskRequirementProjectionReader,
    private readonly skillReader: TaskSkillReader
  ) {
    super()
  }

  override executeAndWrap(
    input: ListTaskRequirementProjectionsInput
  ): ReturnType<BaseQuery<ListTaskRequirementProjectionsInput, TaskRequirementProjection[]>['executeAndWrap']>
  override executeAndWrap(
    taskId: string
  ): ReturnType<BaseQuery<ListTaskRequirementProjectionsInput, TaskRequirementProjection[]>['executeAndWrap']>
  override executeAndWrap(
    inputOrTaskId: ListTaskRequirementProjectionsInput | string
  ): ReturnType<BaseQuery<ListTaskRequirementProjectionsInput, TaskRequirementProjection[]>['executeAndWrap']> {
    const input = typeof inputOrTaskId === 'string' ? { taskId: inputOrTaskId } : inputOrTaskId
    return super.executeAndWrap(input)
  }

  async execute(taskId: string): Promise<TaskRequirementProjection[]> {
    return this.handle({ taskId })
  }

  async handle({ taskId }: ListTaskRequirementProjectionsInput): Promise<TaskRequirementProjection[]> {
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
