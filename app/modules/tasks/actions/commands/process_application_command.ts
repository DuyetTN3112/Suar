import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { ProcessApplicationDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import { syncAssignment } from '#modules/tasks/actions/support/assignment_lifecycle_helper'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canProcessApplication } from '#modules/tasks/domain/task_assignment_rules'
import TaskApplicationRepository from '#modules/tasks/infra/repositories/task_application_repository'
import TaskAssignmentRepository from '#modules/tasks/infra/repositories/task_assignment_repository'
import { ApplicationStatus, type AssignmentType } from '#modules/tasks/public_contracts/task_constants'
import type { TaskApplicationRecord } from '#modules/tasks/types/task_records'

/**
 * ProcessApplicationCommand
 *
 * Allows project owner/manager to approve or reject a task application.
 * On approval:
 * - Creates TaskAssignment record
 * - Updates task's assigned_to
 * - Notifies applicant
 * On rejection:
 * - Records rejection reason
 * - Notifies applicant
 */
export default class ProcessApplicationCommand extends BaseCommand<
  ProcessApplicationDTO,
  TaskApplicationRecord
> {
  constructor(
    execCtx: TaskActionContext,
    private cache: TaskCachePort
  ) {
    super(execCtx)
  }

  async handle(dto: ProcessApplicationDTO): Promise<TaskApplicationRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Get application with task
      const application = await TaskApplicationRepository.findPendingByIdWithTaskAndApplicant(
        dto.application_id,
        trx
      )

      if (!application) {
        throw new NotFoundException('Application không tồn tại hoặc không còn chờ xử lý')
      }

      const task = application.task

      if (!task) {
        throw new NotFoundException('Application task context is missing')
      }

      // Verify user has permission (task creator)
      const existingActiveAssignment = await TaskAssignmentRepository.findActiveByTask(task.id, trx)

      // Check if user is project owner/manager for this task's project
      let isProjectOwnerOrManager = false
      if (task.project_id) {
        const { default: ProjectMember } = await import('#modules/projects/infra/models/project_member')
        const membership = await ProjectMember.query()
          .where('project_id', task.project_id)
          .where('user_id', userId)
          .whereIn('project_role', ['project_owner', 'project_manager'])
          .first()
        isProjectOwnerOrManager = membership !== null
      }

      enforcePolicy(
        canProcessApplication({
          actorId: userId,
          taskCreatorId: task.creator_id,
          action: dto.action,
          isTaskAlreadyAssigned: task.assigned_to !== null || existingActiveAssignment !== null,
          isProjectOwnerOrManager,
        })
      )

      const oldStatus = application.application_status

      if (dto.action === 'approve') {
        await TaskApplicationRepository.updateStatus(
          application.id,
          {
            application_status: ApplicationStatus.APPROVED,
            reviewed_by: userId,
            reviewed_at: DateTime.now(),
          },
          trx
        )

        await syncAssignment(
          {
            taskId: task.id,
            assigneeId: application.applicant_id,
            assignedBy: userId,
            assignmentType: dto.assignment_type as AssignmentType,
          },
          trx
        )

        // Reject other pending applications
        await TaskApplicationRepository.rejectOtherPendingByTask(
          task.id,
          application.id,
          userId,
          'Another applicant was selected',
          trx
        )
      } else {
        await TaskApplicationRepository.updateStatus(
          application.id,
          {
            application_status: ApplicationStatus.REJECTED,
            reviewed_by: userId,
            reviewed_at: DateTime.now(),
            rejection_reason: dto.rejection_reason,
          },
          trx
        )
      }

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'process_application',
          entity_type: 'task_application',
          entity_id: application.id,
          old_values: { status: oldStatus },
          new_values: {
            status: application.application_status,
            action: dto.action,
            rejection_reason: dto.rejection_reason,
          },
        })
      }

      return {
        application: {
          ...application,
          application_status:
            dto.action === 'approve' ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED,
          reviewed_by: userId,
          rejection_reason:
            dto.action === 'reject' ? dto.rejection_reason : application.rejection_reason,
        },
        taskId: task.id,
        applicationReviewedEvent: {
          applicationId: application.id,
          taskId: task.id,
          applicantId: application.applicant_id,
          reviewedBy: userId,
          status: dto.action === 'approve' ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED,
        },
      }
    })

    await this.cache.invalidateAfterTaskApplicationChanged(result.taskId)
    void emitter.emit('task:application:reviewed', result.applicationReviewedEvent)

    return result.application
  }
}
