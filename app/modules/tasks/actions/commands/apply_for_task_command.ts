import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { ApplyForTaskDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canApplyForTask } from '#modules/tasks/domain/task_assignment_rules'
import * as detailQueries from '#modules/tasks/infra/repositories/read/detail_queries'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import * as taskMutations from '#modules/tasks/infra/repositories/write/task_mutations'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'
import type { TaskApplicationRecord } from '#modules/tasks/types/task_records'

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
  constructor(
    execCtx: TaskActionContext,
    private cache: TaskCachePort
  ) {
    super(execCtx)
  }

  async handle(dto: ApplyForTaskDTO): Promise<TaskApplicationRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // ── FETCH ──────────────────────────────────────────────────────────
      const task = await detailQueries.findActiveOrFailAsRecord(dto.task_id, trx)

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
      await taskMutations.updateTask(
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
        taskId: dto.task_id,
        applicationSubmittedEvent: {
          applicationId: application.id,
          taskId: dto.task_id,
          applicantId: userId,
          projectId: task.project_id ?? '',
          ownerId: task.creator_id,
        },
      }
    })

    await this.cache.invalidateAfterTaskApplicationChanged(result.taskId)
    void emitter.emit('task:application:submitted', result.applicationSubmittedEvent)

    return result.application
  }
}
