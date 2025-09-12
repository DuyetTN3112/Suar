import type UpdateTaskDTO from '../dtos/request/update_task_dto.js'

import { notificationPublicApi, type NotificationCreator } from '#actions/notifications/public_api'
import { BaseCommand } from '#actions/tasks/base_command'
import type { TaskDetailQueryRepositoryPort } from '#actions/tasks/ports/task_query_repository_port'
import { persistTaskUpdateWithinTransaction } from '#actions/tasks/support/update_task_persistence_support'
import { runUpdateTaskPostCommitEffects } from '#actions/tasks/support/update_task_post_commit_support'
import BusinessLogicException from '#exceptions/business_logic_exception'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskDetailRecord } from '#types/task_records'

interface UpdateTaskCommandInput {
  taskId: DatabaseId
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
  taskRepository: TaskRepository,
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
    execCtx: ExecutionContext,
    private createNotification: NotificationCreator = notificationPublicApi,
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
      })
    )
    await this.dependencies.runUpdateTaskPostCommitEffects(
      updateResult,
      userId,
      input.dto,
      this.createNotification
    )
    return await this.dependencies.taskRepository.findByIdWithDetailRecord(updateResult.task.id)
  }

  async execute(taskId: DatabaseId, dto: UpdateTaskDTO): Promise<TaskDetailRecord> {
    return await this.handle({ taskId, dto })
  }

  private ensureHasUpdates(dto: UpdateTaskDTO): void {
    if (!dto.hasUpdates()) {
      throw new BusinessLogicException('Không có thay đổi nào để cập nhật')
    }
  }
}
