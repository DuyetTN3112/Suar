import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import {
  BACKEND_NOTIFICATION_ENTITY_TYPES,
  BACKEND_NOTIFICATION_TYPES,
} from '#modules/notifications/public_contracts/notification_constants'
import { buildNotificationEventId } from '#modules/notifications/public_contracts/notification_event_identity'
import { PLATFORM_EVENT_NAMES } from '#modules/observability/public_contracts/platform_event_names'
import {
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/commands/internal/settle_task_post_commit_effects'
import type { ApplyForTaskDTO } from '#modules/tasks/actions/dtos/request/task_application_dtos'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskEventPublisher } from '#modules/tasks/actions/ports/outbound/task_event_publisher'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canApplyForTask } from '#modules/tasks/domain/task-assignment/task_assignment_rules'
import { assertTaskSkillEligibility } from '#modules/tasks/domain/task-assignment/task_skill_eligibility'
import { buildTaskApplicationEvent } from '#modules/tasks/observability/task_event_factory'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'
import type { TaskApplicationRecord } from '#modules/tasks/types/task_records'

/**
 * ApplyForTaskCommand
 *
 * Allows an external contributor to request to join a public task.
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class ApplyForTaskCommand extends BaseCommand<
  ApplyForTaskDTO,
  TaskApplicationRecord
> {
  constructor(
    execCtx: TaskActionContext,
    private taskExternalDependencies: TaskExternalDependencies,
    private cache: TaskCachePort,
    private readonly taskEventPublisher: TaskEventPublisher,
    private readonly notificationStager: TaskNotificationStager
  ) {
    super(execCtx, taskExternalDependencies.transactions)
  }

  async handle(dto: ApplyForTaskDTO): Promise<TaskApplicationRecord> {
    const startedAt = Date.now()
    platformOperationalLogger.log(
      'info',
      buildTaskApplicationEvent(this.execCtx, {
        eventName: PLATFORM_EVENT_NAMES.TASK_APPLICATION_STARTED,
        stage: 'started',
        outcome: 'success',
        taskId: dto.task_id,
        change: {
          application_source: dto.application_source,
        },
      })
    )

    try {
      const result = await this.executeInTransaction(async (trx) => {
        const userId = this.getCurrentUserId()
        await this.taskExternalDependencies.user.ensureActiveUser(userId, trx)

        // ── FETCH ──────────────────────────────────────────────────────────
        const task = await this.taskExternalDependencies.lifecycle.findActiveTask(
          dto.task_id,
          trx
        )
        const eligibility = await this.taskExternalDependencies.skill.getTaskSkillEligibility(
          dto.task_id,
          userId,
          trx
        )
        assertTaskSkillEligibility(eligibility, 'ứng tuyển')

        const existingApplication =
          await this.taskExternalDependencies.lifecycle.findExistingApplication(
            dto.task_id,
            userId,
            trx
          )
        const withdrawnApplication =
          existingApplication === null
            ? await this.taskExternalDependencies.lifecycle.findWithdrawnApplication(
                dto.task_id,
                userId,
                trx
              )
            : null

        const isOrganizationMember = await this.taskExternalDependencies.org.isApprovedMember(
          userId,
          task.organization_id,
          trx
        )
        let projectSummary = null
        if (task.project_id) {
          const summaries = await this.taskExternalDependencies.project.findProjectSummaries(
            [task.project_id],
            trx
          )
          projectSummary = summaries[0] ?? null
        }

        // ── DECIDE (pure, sync) ────────────────────────────────────────────
        const applicationDeadline = task.application_deadline
        enforcePolicy(
          canApplyForTask({
            actorId: userId,
            taskCreatorId: task.creator_id,
            taskVisibility: task.task_visibility ?? '',
            isOrganizationMember,
            isPublicProject: projectSummary?.visibility === 'public',
            allowsExternalContributors: projectSummary?.allowExternalContributors === true,
            isTaskAlreadyAssigned: task.assigned_to !== null,
            isApplicationDeadlinePassed:
              typeof applicationDeadline === 'string' &&
              new Date(applicationDeadline).getTime() <= DateTime.now().toMillis(),
            hasExistingApplication: !!existingApplication,
          })
        )

        // ── PERSIST ────────────────────────────────────────────────────────
        const appliedAt = DateTime.now()
        const application = withdrawnApplication
          ? await this.taskExternalDependencies.lifecycle.reviveWithdrawnApplication(
              withdrawnApplication.id,
              {
                application_source: dto.application_source,
                message: dto.message,
                portfolio_links: dto.portfolio_links,
                applied_at: appliedAt,
              },
              trx
            )
          : await this.taskExternalDependencies.lifecycle.createApplication(
              {
                task_id: dto.task_id,
                applicant_id: userId,
                application_status: ApplicationStatus.PENDING,
                application_source: dto.application_source,
                message: dto.message,
                portfolio_links: dto.portfolio_links,
                applied_at: appliedAt,
              },
              trx
            )

        // Update task's application count
        await this.taskExternalDependencies.lifecycle.updateTask(
          dto.task_id,
          { external_applications_count: (task.external_applications_count ?? 0) + 1 },
          trx
        )

        // Log audit
        if (this.execCtx.userId) {
          await auditPublicApi.write(
            this.execCtx,
            {
              user_id: this.execCtx.userId,
              action: 'apply_task',
              critical: true,
              entity_type: 'task_application',
              entity_id: application.id,
              old_values: null,
              new_values: {
                task_id: dto.task_id,
                task_title: task.title,
              },
            },
            trx
          )
        }

        const occurredAt = appliedAt.toUTC().toISO()
        if (!occurredAt) {
          throw new InvariantViolationException(
            'Persisted task application is missing its application timestamp'
          )
        }
        await this.notificationStager.stage(
          {
            eventId: buildNotificationEventId({
              eventName: 'task.application_submitted',
              businessEventId: withdrawnApplication
                ? `${application.id}:${occurredAt}`
                : application.id,
              recipientId: task.creator_id,
            }),
            schemaVersion: 1,
            type: BACKEND_NOTIFICATION_TYPES.TASK_APPLICATION,
            recipientId: task.creator_id,
            scope: { kind: 'organization', id: task.organization_id },
            actor: { type: 'user', id: userId },
            subject: {
              type: BACKEND_NOTIFICATION_ENTITY_TYPES.TASK_APPLICATION,
              id: application.id,
            },
            parameters: {
              taskTitle: task.title,
            },
            occurredAt,
            correlationId: application.id,
          },
          { trx }
        )

        return {
          application,
          taskId: dto.task_id,
          organizationId: task.organization_id,
          taskTitle: task.title,
          applicationSubmittedEvent: {
            applicationId: application.id,
            taskId: dto.task_id,
            applicantId: userId,
            projectId: task.project_id ?? '',
            ownerId: task.creator_id,
          },
        }
      })

      await settleTaskPostCommitEffects({
        operation: 'task.application.submit',
        context: {
          taskId: result.taskId,
          applicationId: result.application.id,
          actorId: result.applicationSubmittedEvent.applicantId,
        },
        effects: [
          {
            name: 'cache.invalidate_after_application_change',
            run: () =>
              this.cache.invalidateAfterTaskApplicationChanged(
                result.taskId,
                result.organizationId,
                result.applicationSubmittedEvent.applicantId
              ),
          },
          {
            name: 'event.task_application_submitted',
            run: () =>
              this.taskEventPublisher.publishTaskApplicationSubmitted(
                result.applicationSubmittedEvent
              ),
          },
        ],
      })
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildTaskApplicationEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.TASK_APPLICATION_SUBMITTED,
          stage: 'completed',
          outcome: 'success',
          taskId: result.taskId,
          applicationId: result.application.id,
          change: {
            application_source: dto.application_source,
            task_title: result.taskTitle,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
        })
      )

      return result.application
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
        this.execCtx,
        buildTaskApplicationEvent(this.execCtx, {
          eventName: PLATFORM_EVENT_NAMES.TASK_APPLICATION_FAILED,
          stage: 'failed',
          outcome: 'failure',
          taskId: dto.task_id,
          change: {
            application_source: dto.application_source,
          },
          runtime: {
            duration_ms: Date.now() - startedAt,
          },
          error,
        })
      )

      throw error
    }
  }
}
