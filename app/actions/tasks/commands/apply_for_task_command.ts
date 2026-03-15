import type { HttpContext } from '@adonisjs/core/http'
import type { ExecutionContext } from '#types/execution_context'
import { BaseCommand } from '#actions/shared/base_command'
import TaskApplication from '#models/task_application'
import Task from '#models/task'
import type { ApplyForTaskDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import { ApplicationStatus } from '#constants/task_constants'
import { enforcePolicy } from '#domain/shared/enforce_policy'
import { canApplyForTask } from '#domain/tasks/task_assignment_rules'

/**
 * ApplyForTaskCommand
 *
 * Allows a freelancer to apply for a public task.
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class ApplyForTaskCommand extends BaseCommand<ApplyForTaskDTO, TaskApplication> {
  constructor(ctx: HttpContext | ExecutionContext) {
    super(ctx)
  }

  async handle(dto: ApplyForTaskDTO): Promise<TaskApplication> {
    return await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // ── FETCH ──────────────────────────────────────────────────────────
      const task = await Task.query({ client: trx })
        .where('id', dto.task_id)
        .whereNull('deleted_at')
        .firstOrFail()

      const existingApplication = await TaskApplication.query({ client: trx })
        .where('task_id', dto.task_id)
        .where('applicant_id', userId)
        .whereNot('application_status', ApplicationStatus.WITHDRAWN)
        .first()

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      enforcePolicy(
        canApplyForTask({
          actorId: userId,
          taskCreatorId: task.creator_id,
          taskVisibility: task.task_visibility,
          hasExistingApplication: !!existingApplication,
        })
      )

      // ── PERSIST ────────────────────────────────────────────────────────
      const application = await TaskApplication.create(
        {
          task_id: String(dto.task_id),
          applicant_id: String(userId),
          application_status: ApplicationStatus.PENDING,
          application_source: dto.application_source,
          message: dto.message,
          expected_rate: dto.expected_rate,
          portfolio_links: dto.portfolio_links,
        },
        { client: trx }
      )

      // Update task's application count
      task.external_applications_count = (task.external_applications_count || 0) + 1
      await task.useTransaction(trx).save()

      // Log audit
      await this.logAudit('apply_task', 'task_application', application.id, null, {
        task_id: dto.task_id,
        task_title: task.title,
        expected_rate: dto.expected_rate,
      })

      // Invalidate cache
      await CacheService.deleteByPattern(`task:${dto.task_id}:*`)

      // Emit domain event
      void emitter.emit('task:application:submitted', {
        applicationId: application.id,
        taskId: dto.task_id,
        applicantId: userId,
        projectId: task.project_id ?? '',
        ownerId: task.creator_id,
      })

      return application
    })
  }
}
