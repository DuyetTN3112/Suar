import { BaseQuery } from '#modules/tasks/actions/base_query'
import type {
  TaskRequirementReader,
  TaskRequirementVersionRecord,
} from '#modules/tasks/actions/ports/outbound/task_requirement_repository'
import {
  diffTaskRequirementVersionItems,
  type TaskRequirementVersionDiff,
} from '#modules/tasks/domain/task-requirements/task_skill_requirement_rules'

export interface TaskRequirementVersionWithDiff {
  version: TaskRequirementVersionRecord
  diff: TaskRequirementVersionDiff
}

type ListTaskRequirementVersionsInput = { taskId: string }

export default class ListTaskRequirementVersionsQuery extends BaseQuery<
  ListTaskRequirementVersionsInput,
  TaskRequirementVersionWithDiff[]
> {
  constructor(private readonly requirements: TaskRequirementReader) {
    super()
  }

  override executeAndWrap(
    input: ListTaskRequirementVersionsInput
  ): ReturnType<BaseQuery<ListTaskRequirementVersionsInput, TaskRequirementVersionWithDiff[]>['executeAndWrap']>
  override executeAndWrap(
    taskId: string
  ): ReturnType<BaseQuery<ListTaskRequirementVersionsInput, TaskRequirementVersionWithDiff[]>['executeAndWrap']>
  override executeAndWrap(
    inputOrTaskId: ListTaskRequirementVersionsInput | string
  ): ReturnType<BaseQuery<ListTaskRequirementVersionsInput, TaskRequirementVersionWithDiff[]>['executeAndWrap']> {
    const input = typeof inputOrTaskId === 'string' ? { taskId: inputOrTaskId } : inputOrTaskId
    return super.executeAndWrap(input)
  }

  async execute(taskId: string): Promise<TaskRequirementVersionWithDiff[]> {
    return this.handle({ taskId })
  }

  async handle({ taskId }: ListTaskRequirementVersionsInput): Promise<TaskRequirementVersionWithDiff[]> {
    const versions = await this.requirements.findVersionsByTask(taskId)

    return versions.map((version, index) => ({
      version,
      diff: diffTaskRequirementVersionItems(
        versions[index - 1]?.items ?? [],
        version.items
      ),
    }))
  }
}
