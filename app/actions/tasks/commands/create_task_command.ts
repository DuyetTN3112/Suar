import type CreateTaskDTO from '../dtos/request/create_task_dto.js'

import CreateNotification from '#actions/common/create_notification'
import { BaseCommand } from '#actions/shared/base_command'
import { persistTaskCreateWithinTransaction } from '#actions/tasks/support/task_create_persistence_support'
import { runTaskCreatedPostCommitEffects } from '#actions/tasks/support/task_create_post_commit'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type Task from '#models/task'
import type { ExecutionContext } from '#types/execution_context'

interface CreateTaskCommandDependencies {
  persistTaskCreateWithinTransaction: typeof persistTaskCreateWithinTransaction
  runTaskCreatedPostCommitEffects: typeof runTaskCreatedPostCommitEffects
  taskRepository: Pick<typeof TaskRepository, 'findByIdWithDetailRelations'>
}

const defaultDependencies: CreateTaskCommandDependencies = {
  persistTaskCreateWithinTransaction,
  runTaskCreatedPostCommitEffects,
  taskRepository: TaskRepository,
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
export default class CreateTaskCommand extends BaseCommand<CreateTaskDTO, Task> {
  constructor(
    execCtx: ExecutionContext,
    private createNotification: CreateNotification = new CreateNotification(),
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
  async handle(dto: CreateTaskDTO): Promise<Task> {
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
    return await this.dependencies.taskRepository.findByIdWithDetailRelations(newTask.id)
  }

  async execute(dto: CreateTaskDTO): Promise<Task> {
    return await this.handle(dto)
  }
}
