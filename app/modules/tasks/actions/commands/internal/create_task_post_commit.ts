import type CreateTaskDTO from '#modules/tasks/actions/dtos/request/create_task_dto'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/services/task_post_commit_effect_settler'
import type { TaskRecord } from '#modules/tasks/types/task_records'

export async function runTaskCreatedPostCommitEffects(
  task: TaskRecord,
  dto: CreateTaskDTO,
  creatorId: string,
  cache: TaskCachePort,
  taskEventPublisher: TaskEventPublisher
): Promise<void> {
  await settleTaskPostCommitEffects({
    operation: 'task.create',
    context: {
      taskId: task.id,
      actorId: creatorId,
      organizationId: dto.organization_id,
    },
    effects: [
      {
        name: `event.task_created.${task.id}`,
        run: () =>
          taskEventPublisher.publishTaskCreated({
            taskId: task.id,
            creatorId,
            organizationId: dto.organization_id,
            projectId: dto.project_id,
          }),
      },
      {
        name: `cache.task_created.invalidate_now.${task.id}`,
        run: () => cache.invalidateAfterTaskCreated(dto.organization_id),
      },
    ],
  })
}
