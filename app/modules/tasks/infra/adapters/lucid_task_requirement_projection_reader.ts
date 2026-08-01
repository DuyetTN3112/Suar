import type { TaskRequirementProjectionSource } from '#modules/tasks/actions/ports/outbound/task_requirement_projection_reader'
import { TaskRequirementProjectionReader } from '#modules/tasks/actions/ports/outbound/task_requirement_projection_reader'
import { TaskRequirementRepository } from '#modules/tasks/infra/repositories/task_requirement_repository'

export class LucidTaskRequirementProjectionReader extends TaskRequirementProjectionReader {
  async findByTask(taskId: string): Promise<TaskRequirementProjectionSource[]> {
    return TaskRequirementRepository.findByTask(taskId)
  }
}
