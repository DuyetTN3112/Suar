import type CreateTaskDTO from '../dtos/request/create_task_dto.js'

import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import type { TaskDetailQueryRepositoryPort } from '#modules/tasks/actions/ports/task_query_repository_port'
import { persistTaskCreateWithinTransaction } from '#modules/tasks/actions/support/task_create_persistence_support'
import { runTaskCreatedPostCommitEffects } from '#modules/tasks/actions/support/task_create_post_commit'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskDetailQueryRepository } from '#modules/tasks/infra/repositories/read/task_detail_query_repository'
import type { TaskDetailRecord } from '#modules/tasks/types/task_records'

interface CreateTaskCommandDependencies {
  persistTaskCreateWithinTransaction: typeof persistTaskCreateWithinTransaction
  runTaskCreatedPostCommitEffects: typeof runTaskCreatedPostCommitEffects
  taskRepository: TaskDetailQueryRepositoryPort
}

const defaultDependencies: CreateTaskCommandDependencies = {
  persistTaskCreateWithinTransaction,
  runTaskCreatedPostCommitEffects,
  taskRepository: taskDetailQueryRepository,
}

/**
 * Command để tạo task mới
 *
 * Business Rules:
 * - organization_id là bắt buộc (từ session)
 * - creator_id tự động set từ auth.user
 * - Notification gửi cho assignee nếu task được giao
 * - Audit log đầy đủ
 * - Transaction để ensure data consistency
 *
 * Permissions:
 * - User phải đăng nhập
 * - User phải thuộc organization
 * - Có thể thêm permission check (admin/member) nếu cần
 */
export default class CreateTaskCommand extends BaseCommand<CreateTaskDTO, TaskDetailRecord> {
  constructor(
    execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private createNotification: NotificationCreator,
    private cache: TaskCachePort,
    private dependencies: CreateTaskCommandDependencies = defaultDependencies
  ) {
    super(execCtx)
  }

  /**
   * Execute command để tạo task
   *
   * Di chuyển logic từ database procedure create_task:
   * 1. Check creator active
   * 2. Check org exists
   * 3. Check permission (admin/owner OR project_manager)
   * 4. Validate project thuộc org
   * 5. Validate status/label/priority exists
   * 6. Validate due_date not past
   */
  async handle(dto: CreateTaskDTO): Promise<TaskDetailRecord> {
    const userId = this.getCurrentUserId()
    const newTask = await this.executeInTransaction((trx) =>
      this.dependencies.persistTaskCreateWithinTransaction({
        execCtx: this.execCtx,
        dto,
        userId,
        trx,
        externalDependencies: this.taskExternalDependencies,
      })
    )
    await this.dependencies.runTaskCreatedPostCommitEffects(
      newTask,
      dto,
      userId,
      this.createNotification,
      this.taskExternalDependencies.user,
      this.cache
    )
    return await this.dependencies.taskRepository.findByIdWithDetailRecord(newTask.id)
  }

  async execute(dto: CreateTaskDTO): Promise<TaskDetailRecord> {
    return await this.handle(dto)
  }

}
