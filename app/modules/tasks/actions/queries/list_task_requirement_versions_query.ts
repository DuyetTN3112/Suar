import type {
  TaskRequirementReader,
  TaskRequirementVersionRecord,
} from '#modules/tasks/actions/ports/outbound/task_requirement_repository'
import {
  diffTaskRequirementVersionItems,
  type TaskRequirementVersionDiff,
} from '#modules/tasks/domain/task_skill_requirement_rules'

export interface TaskRequirementVersionWithDiff {
  version: TaskRequirementVersionRecord
  diff: TaskRequirementVersionDiff
}

export default class ListTaskRequirementVersionsQuery {
  constructor(private readonly requirements: TaskRequirementReader) {}

  async execute(taskId: string): Promise<TaskRequirementVersionWithDiff[]> {
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
