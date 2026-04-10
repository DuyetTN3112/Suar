import { BaseCommand } from '#actions/shared/base_command'
import TaskApplicationRepository from '#infra/tasks/repositories/task_application_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { ApplyForTaskDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import CacheService from '#infra/cache/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import { ApplicationStatus } from '#constants/task_constants'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canApplyForTask } from '#domain/tasks/task_assignment_rules'
import { DateTime } from 'luxon'

/**
 * ApplyForTaskCommand
 *
 * Allows a freelancer to apply for a public task.
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class ApplyForTaskCommand extends BaseCommand<
  ApplyForTaskDTO,
  import('#models/task_application').default
> {
  async handle(dto: ApplyForTaskDTO): Promise<import('#models/task_application').default> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // ── FETCH ──────────────────────────────────────────────────────────
      const task = await TaskRepository.findActiveOrFail(dto.task_id, trx)

      const existingApplication =
        await TaskApplicationRepository.findExistingNonWithdrawnByTaskAndApplicant(
          dto.task_id,
          userId,
          trx
        )

      // ── DECIDE (pure, sync) ────────────────────────────────────────────
      enforcePolicy(
        canApplyForTask({
          actorId: userId,
          taskCreatorId: task.creator_id,
          taskVisibility: task.task_visibility,
          isTaskAlreadyAssigned: task.assigned_to !== null,
          isApplicationDeadlinePassed:
            task.application_deadline !== null &&
            task.application_deadline.toMillis() <= DateTime.now().toMillis(),
          hasExistingApplication: !!existingApplication,
        })
      )

      // ── PERSIST ────────────────────────────────────────────────────────
      const application = await TaskApplicationRepository.create(
        {
          task_id: dto.task_id,
          applicant_id: userId,
          application_status: ApplicationStatus.PENDING,
          application_source: dto.application_source,
          message: dto.message,
          expected_rate: dto.expected_rate,
          portfolio_links: dto.portfolio_links,
        },
        trx
      )

      // Update task's application count
      task.external_applications_count = (task.external_applications_count || 0) + 1
      await TaskRepository.save(task, trx)

      // Log audit
      await this.logAudit('apply_task', 'task_application', application.id, null, {
        task_id: dto.task_id,
        task_title: task.title,
        expected_rate: dto.expected_rate,
      })

      return {
        application,
        cachePattern: `task:${dto.task_id}:*`,
        applicationSubmittedEvent: {
          applicationId: application.id,
          taskId: dto.task_id,
          applicantId: userId,
          projectId: task.project_id ?? '',
          ownerId: task.creator_id,
        },
      }
    })

    await CacheService.deleteByPattern(result.cachePattern)
    void emitter.emit('task:application:submitted', result.applicationSubmittedEvent)

    return result.application
  }
}
