import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseCommand } from '#actions/tasks/base_command'
import type { ApplyForTaskDTO } from '#actions/tasks/dtos/request/task_application_dtos'
import { ApplicationStatus } from '#constants/task_constants'
import { canApplyForTask } from '#domain/tasks/task_assignment_rules'
import CacheService from '#infra/cache/cache_service'
import TaskApplicationRepository from '#infra/tasks/repositories/task_application_repository'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import type { TaskApplicationRecord } from '#types/task_records'

/**
 * ApplyForTaskCommand
 *
 * Allows a freelancer to apply for a public task.
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class ApplyForTaskCommand extends BaseCommand<
  ApplyForTaskDTO,
  TaskApplicationRecord
> {
  async handle(dto: ApplyForTaskDTO): Promise<TaskApplicationRecord> {
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
      const applicationDeadline = task.application_deadline
      enforcePolicy(
        canApplyForTask({
          actorId: userId,
          taskCreatorId: task.creator_id,
          taskVisibility: task.task_visibility ?? '',
          isTaskAlreadyAssigned: task.assigned_to !== null,
          isApplicationDeadlinePassed:
            typeof applicationDeadline === 'string' &&
            new Date(applicationDeadline).getTime() <= DateTime.now().toMillis(),
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
      await TaskRepository.updateTask(
        dto.task_id,
        { external_applications_count: (task.external_applications_count ?? 0) + 1 },
        trx
      )

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'apply_task',
          entity_type: 'task_application',
          entity_id: application.id,
          old_values: null,
          new_values: {
            task_id: dto.task_id,
            task_title: task.title,
            expected_rate: dto.expected_rate,
          },
        })
      }

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
