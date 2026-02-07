import type UpdateTaskDTO from '../dtos/request/update_task_dto.js'

import BusinessLogicException from '#exceptions/business_logic_exception'
import { notificationPublicApi, type NotificationCreator } from '#modules/notifications/actions/public_api'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskDetailQueryRepositoryPort } from '#modules/tasks/actions/ports/task_query_repository_port'
import { persistTaskUpdateWithinTransaction } from '#modules/tasks/actions/support/update_task_persistence_support'
import { runUpdateTaskPostCommitEffects } from '#modules/tasks/actions/support/update_task_post_commit_support'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
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
