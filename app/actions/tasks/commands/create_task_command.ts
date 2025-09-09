import type CreateTaskDTO from '../dtos/request/create_task_dto.js'

import { notificationPublicApi, type NotificationCreator } from '#actions/notifications/public_api'
import { BaseCommand } from '#actions/tasks/base_command'
import type { TaskDetailQueryRepositoryPort } from '#actions/tasks/ports/task_query_repository_port'
import { persistTaskCreateWithinTransaction } from '#actions/tasks/support/task_create_persistence_support'
import { runTaskCreatedPostCommitEffects } from '#actions/tasks/support/task_create_post_commit'
import { taskDetailQueryRepository } from '#infra/tasks/repositories/read/task_detail_query_repository'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskDetailRecord } from '#types/task_records'

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
    execCtx: ExecutionContext,
    private createNotification: NotificationCreator = notificationPublicApi,
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
      })
    )
    await this.dependencies.runTaskCreatedPostCommitEffects(
      newTask,
      dto,
      userId,
      this.createNotification
    )
    return await this.dependencies.taskRepository.findByIdWithDetailRecord(newTask.id)
  }

  async execute(dto: CreateTaskDTO): Promise<TaskDetailRecord> {
    return await this.handle(dto)
  }
}
