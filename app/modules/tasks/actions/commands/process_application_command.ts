import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import type { ProcessApplicationDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskPermissionReader, TaskExternalDependencies  } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskOrganizationMembershipWriter } from '#modules/tasks/actions/ports/outbound/task_organization_membership_writer'
import {
  hasOrganizationApplicationReviewRole,
  hasProjectApplicationReviewRole,
} from '#modules/tasks/actions/services/task_application_review_access'
import { synchronizeTaskAssignment } from '#modules/tasks/actions/services/task_assignment_synchronizer'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/services/task_post_commit_effect_settler'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canProcessApplication } from '#modules/tasks/domain/task_assignment_rules'
import {
  ApplicationStatus,
  type AssignmentType,
} from '#modules/tasks/public_contracts/task_constants'
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
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher,
    private readonly notificationStager: TaskNotificationStager,
    private readonly organizationMembershipWriter: TaskOrganizationMembershipWriter,
    private readonly permissionReader: TaskPermissionReader,
    private readonly taskExternalDependencies: TaskExternalDependencies
  ) {
    super(execCtx, taskExternalDependencies.transactions)
  }

  async handle(dto: ProcessApplicationDTO): Promise<TaskApplicationRecord> {
    const result = await this.executeInTransaction(async (trx) => {
      const userId = this.getCurrentUserId()

      // Get application with task
      const application =
        await this.taskExternalDependencies.lifecycle.findPendingApplication(
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

      // Verify user has permission to review this marketplace application.
      const existingActiveAssignment =
        await this.taskExternalDependencies.activeAssignmentReader?.findActiveAssignment(
          task.id,
          trx
        )

      const [isProjectOwnerOrManager, isOrganizationOwnerOrAdmin] = await Promise.all([
        hasProjectApplicationReviewRole(
          userId,
          task.project_id,
          this.permissionReader,
          trx
        ),
        hasOrganizationApplicationReviewRole(
          userId,
          task.organization_id,
          this.permissionReader,
          trx
        ),
      ])

      enforcePolicy(
        canProcessApplication({
          actorId: userId,
          taskCreatorId: task.creator_id,
          action: dto.action,
          isTaskAlreadyAssigned: task.assigned_to !== null || existingActiveAssignment !== null,
          isProjectOwnerOrManager,
          isOrganizationOwnerOrAdmin,
        })
      )

      const oldStatus = application.application_status
      const decisionStatus =
        dto.action === 'approve' ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED
      const reviewedAt = DateTime.now()
      let persistedDecision: TaskApplicationRecord

      if (dto.action === 'approve') {
        persistedDecision =
          await this.taskExternalDependencies.lifecycle.updateApplicationStatus(
          application.id,
          {
            application_status: decisionStatus,
            reviewed_by: userId,
            reviewed_at: reviewedAt,
          },
          trx
        )

        await synchronizeTaskAssignment(
          {
            taskId: task.id,
            assigneeId: application.applicant_id,
            assignedBy: userId,
            assignmentType: dto.assignment_type as AssignmentType,
            ...(dto.estimated_hours === null
              ? {}
              : { estimatedHours: dto.estimated_hours }),
          },
          trx,
          this.taskExternalDependencies.assignments,
          this.taskExternalDependencies.lifecycle
        )

        await this.organizationMembershipWriter.ensureApprovedMembership(
          task.organization_id,
          application.applicant_id,
          trx
        )

        // Reject other pending applications
        await this.taskExternalDependencies.lifecycle.rejectOtherPendingApplications(
          task.id,
          application.id,
          userId,
          'Another applicant was selected',
          trx
        )
      } else {
        persistedDecision =
          await this.taskExternalDependencies.lifecycle.updateApplicationStatus(
          application.id,
          {
            application_status: decisionStatus,
            reviewed_by: userId,
            reviewed_at: reviewedAt,
            rejection_reason: dto.rejection_reason,
          },
          trx
        )
      }

      // Log audit
      if (this.execCtx.userId) {
        await auditPublicApi.write(
          this.execCtx,
          {
            user_id: this.execCtx.userId,
            action: 'process_application',
            critical: true,
            entity_type: 'task_application',
            entity_id: application.id,
            old_values: { status: oldStatus },
            new_values: {
              status: decisionStatus,
              action: dto.action,
              rejection_reason: dto.rejection_reason,
            },
          },
          trx
        )
      }

      const occurredAt = reviewedAt.toUTC().toISO()
      if (!occurredAt) {
        throw new InvariantViolationException(
          'Persisted task application decision is missing its review timestamp'
        )
      }
      await this.notificationStager.stage(
        {
          eventId: buildNotificationEventId({
            eventName: 'task.application_reviewed',
            businessEventId: `${application.id}:${decisionStatus}:${occurredAt}`,
            recipientId: application.applicant_id,
          }),
          schemaVersion: 1,
          type: BACKEND_NOTIFICATION_TYPES.TASK_APPLICATION_REVIEW,
          recipientId: application.applicant_id,
          scope: { kind: 'organization', id: task.organization_id },
          actor: { type: 'user', id: userId },
          subject: {
            type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK_APPLICATION,
            id: application.id,
          },
          parameters: {
            status: decisionStatus,
            taskTitle: task.title,
          },
          occurredAt,
          correlationId: application.id,
        },
        { trx }
      )

      return {
        application: {
          ...persistedDecision,
        },
        taskId: task.id,
        organizationId: task.organization_id,
        applicationReviewedEvent: {
          applicationId: application.id,
          taskId: task.id,
          applicantId: application.applicant_id,
          reviewedBy: userId,
          status: decisionStatus,
        },
      }
    })

    await settleTaskPostCommitEffects({
      operation: 'task.application.review',
      context: {
        taskId: result.taskId,
        applicationId: result.application.id,
        actorId: result.applicationReviewedEvent.reviewedBy,
      },
      effects: [
        {
          name: 'cache.invalidate_after_application_change',
          run: () =>
            this.cache.invalidateAfterTaskApplicationChanged(
              result.taskId,
              result.organizationId,
              result.applicationReviewedEvent.applicantId
            ),
        },
        {
          name: 'organization.settle_approved_membership',
          run: () =>
            this.organizationMembershipWriter.settleApprovedMembership(
              result.organizationId,
              result.applicationReviewedEvent.applicantId
            ),
        },
        {
          name: 'event.task_application_reviewed',
          run: () =>
            this.taskEventPublisher.publishTaskApplicationReviewed(result.applicationReviewedEvent),
        },
      ],
    })

    return result.application
  }
}
