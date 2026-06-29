import type { DeleteProjectDTO } from '../../dtos/request/delete_project_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActorLookup } from '#modules/projects/actions/ports/outbound/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/actions/ports/outbound/project_audit_event_publisher'
import type { ProjectIdentityGenerator } from '#modules/projects/actions/ports/outbound/project_identity_generator'
import type { ProjectLifecycleEventStager } from '#modules/projects/actions/ports/outbound/project_lifecycle_event_stager'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectOrganizationAccessReader } from '#modules/projects/actions/ports/outbound/project_organization_access'
import type { ProjectPostCommitFailureObserver } from '#modules/projects/actions/ports/outbound/project_post_commit_failure_observer'
import type { ProjectTaskCacheInvalidator } from '#modules/projects/actions/ports/outbound/project_task_cache_invalidator'
import type { ProjectTaskStatsReader } from '#modules/projects/actions/ports/outbound/project_task_stats_reader'
import type { ProjectTransactionRunner } from '#modules/projects/actions/ports/outbound/project_transaction'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { canDeleteProject } from '#modules/projects/domain/project-members/project_permission_policy'

/**
 * Command to delete a project (soft delete by default)
 *
 * Business Rules:
 * - Only the project owner or Organization owner/admin can delete projects
 * - Warns if project has incomplete tasks
 * - Soft delete by default (sets deleted_at timestamp)
 * - Permanent delete option available (use with caution)
 *
 * @extends {BaseCommand<DeleteProjectDTO, void>}
 */
export default class DeleteProjectCommand extends BaseCommand<DeleteProjectDTO> {
  constructor(
    execCtx: ProjectActionContext,
    transactionRunner: ProjectTransactionRunner,
    private readonly projects: ProjectLifecycleRepository,
    private readonly identities: ProjectIdentityGenerator,
    private readonly lifecycleEvents: ProjectLifecycleEventStager,
    private readonly taskStatsReader: ProjectTaskStatsReader,
    private readonly taskCache: ProjectTaskCacheInvalidator,
    private readonly actorLookup: ProjectActorLookup,
    private readonly organizationAccessReader: ProjectOrganizationAccessReader,
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher,
    private readonly postCommitFailures?: ProjectPostCommitFailureObserver
  ) {
    super(execCtx, transactionRunner)
  }

  /**
   * Execute the command
   *
   * @param dto - Validated DeleteProjectDTO
   */
  async handle(dto: DeleteProjectDTO): Promise<void> {
    const userId = this.getCurrentUserId()
    const lifecycleMutationId = this.identities.generate()

    const deletedProjectEvent = await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await this.projects.findForUpdate(dto.project_id, trx)

      // Optional scope guard for adapters that require current organization context.
      if (dto.currentOrganizationId && project.organization_id !== dto.currentOrganizationId) {
        enforcePolicy(PR.deny('Dự án không thuộc tổ chức hiện tại'))
      }

      // 2. Check permissions and incomplete tasks via pure rule
      await this.actorLookup.findProjectActor(userId, trx)
      const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
        {
          organizationId: project.organization_id,
          actorUserId: userId,
        },
        trx
      )
      const taskStats = await this.taskStatsReader.getTaskStats(project.id, trx)

      enforcePolicy(
        canDeleteProject({
          actorId: userId,
          actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
          projectOwnerId: project.owner_id ?? '',
          projectCreatorId: project.creator_id,
          incompleteTaskCount: taskStats.incompleteTasks,
          pendingReviewSessionCount: taskStats.pendingReviewSessions,
        })
      )

      // 4. Store old values for audit
      const oldValues = { ...project }

      // 5. Perform delete (soft or permanent)
      const deletedProject = dto.isPermanentDelete()
        ? await this.projects.hardDelete(project.id, trx)
        : await this.projects.softDelete(project.id, trx)

      await this.projectAuditEventPublisher.publishProjectAudit(
        this.execCtx,
        {
          action: 'delete',
          entityId: project.id,
          oldValues,
          newValues: {
            deleted_at: deletedProject.deleted_at,
            reason: dto.reason,
            permanent: dto.permanent,
          },
        },
        trx
      )
      await this.lifecycleEvents.stage({
        mutationId: lifecycleMutationId,
        action: 'deleted',
        projectId: project.id,
        organizationId: project.organization_id,
        actorId: userId,
        projectName: null,
        occurredAt: deletedProject.deleted_at ?? new Date().toISOString(),
      }, trx)

      return {
        projectId: project.id,
        organizationId: project.organization_id,
      }
    })

    await this.settlePostCommitEffect(
      'project.cache_metadata.invalidated',
      () => this.taskCache.invalidateTaskCollectionMetadata(deletedProjectEvent.organizationId),
      {
        projectId: deletedProjectEvent.projectId,
        actorId: userId,
      },
      this.postCommitFailures
    )
  }
}
