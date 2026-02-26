import type UpdateTaskDTO from '../dtos/request/update_task_dto.js'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskDetailQueryRepositoryPort } from '#modules/tasks/actions/ports/task_query_repository_port'
import { persistTaskUpdateWithinTransaction } from '#modules/tasks/actions/support/update_task_persistence_support'
import { runUpdateTaskPostCommitEffects } from '#modules/tasks/actions/support/update_task_post_commit_support'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

interface UpdateTaskCommandInput {
  taskId: string
  dto: UpdateTaskDTO
}

interface UpdateTaskCommandDependencies {
  persistTaskUpdateWithinTransaction: typeof persistTaskUpdateWithinTransaction
  runUpdateTaskPostCommitEffects: typeof runUpdateTaskPostCommitEffects
  taskRepository: TaskDetailQueryRepositoryPort
}

const defaultDependencies: UpdateTaskCommandDependencies = {
  persistTaskUpdateWithinTransaction,
  runUpdateTaskPostCommitEffects,
  taskRepository: detailQueries,
}

/**
 * Command để cập nhật task
 *
 * Business Rules:
 * - Task phải thuộc organization hiện tại
 * - Permission-based updates with field-level restrictions
 * - Track old values cho audit
 * - Version history
 * - Notifications
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class UpdateTaskCommand extends BaseCommand<UpdateTaskCommandInput, TaskDetailRecord> {
  constructor(
    execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private createNotification: NotificationCreator,
    private cache: TaskCachePort,
    private dependencies: UpdateTaskCommandDependencies = defaultDependencies
  ) {
    super(execCtx)
  }

  /**
   * Execute command để cập nhật task
   *
   * Di chuyển logic từ database triggers:
   * - before_task_update: Validate assignee thuộc org
   * - task_version_after_update: Tạo version history khi có thay đổi
   */
  async handle(input: UpdateTaskCommandInput): Promise<TaskDetailRecord> {
    const userId = this.getCurrentUserId()
    this.ensureHasUpdates(input.dto)
    const updateResult = await this.executeInTransaction((trx) =>
      this.dependencies.persistTaskUpdateWithinTransaction({
        execCtx: this.execCtx,
        taskId: input.taskId,
        dto: input.dto,
        userId,
        trx,
        externalDependencies: this.taskExternalDependencies,
      })
    )
    await this.dependencies.runUpdateTaskPostCommitEffects(
      updateResult,
      userId,
      input.dto,
      this.createNotification,
      this.taskExternalDependencies.user,
      this.cache
    )
    return await this.dependencies.taskRepository.findByIdWithDetailRecord(updateResult.task.id)
  }

  async execute(taskId: string, dto: UpdateTaskDTO): Promise<TaskDetailRecord> {
    return await this.handle({ taskId, dto })
  }

  private ensureHasUpdates(dto: UpdateTaskDTO): void {
    if (!dto.hasUpdates()) {
      throw new BusinessLogicException('Không có thay đổi nào để cập nhật')
    }
  }

}
