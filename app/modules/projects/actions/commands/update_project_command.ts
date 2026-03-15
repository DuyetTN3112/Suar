import type { UpdateProjectDTO } from '../dtos/request/update_project_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActorLookup } from '#modules/projects/actions/ports/outbound/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/actions/ports/outbound/project_audit_event_publisher'
import type { ProjectIdentityGenerator } from '#modules/projects/actions/ports/outbound/project_identity_generator'
import type { ProjectLifecycleEventStager } from '#modules/projects/actions/ports/outbound/project_lifecycle_event_stager'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectOrganizationAccessReader } from '#modules/projects/actions/ports/outbound/project_organization_access'
import type { ProjectPostCommitFailureObserver } from '#modules/projects/actions/ports/outbound/project_post_commit_failure_observer'
import type { ProjectTaskCacheInvalidator } from '#modules/projects/actions/ports/outbound/project_task_cache_invalidator'
import type {
  ProjectTransaction,
  ProjectTransactionRunner,
} from '#modules/projects/actions/ports/outbound/project_transaction'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { canUpdateProjectFields } from '#modules/projects/domain/project_permission_policy'
import type { ProjectRecord } from '#modules/projects/types/project_records'

/**
 * Command to update an existing project
 *
 * Business Rules:
 * - Owner can update all fields
 * - Organization owner/admin can update all fields
 * - Manager can update: description, start_date, end_date, status
 * - Logs all field changes to audit trail
 *
 * @extends {BaseCommand<UpdateProjectDTO, ProjectRecord>}
 */
export default class UpdateProjectCommand extends BaseCommand<UpdateProjectDTO, ProjectRecord> {
  constructor(
    execCtx: ProjectActionContext,
    transactionRunner: ProjectTransactionRunner,
    private readonly projects: ProjectLifecycleRepository,
    private readonly memberships: ProjectMembershipRepository,
    private readonly identities: ProjectIdentityGenerator,
    private readonly lifecycleEvents: ProjectLifecycleEventStager,
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
   * @param dto - Validated UpdateProjectDTO
   * @returns Updated project
   */
  async handle(dto: UpdateProjectDTO): Promise<ProjectRecord> {
    const userId = this.getCurrentUserId()
    const lifecycleMutationId = this.identities.generate()

    // Check if there are any updates
    if (!dto.hasUpdates()) {
      throw new BusinessLogicException('Không có thay đổi nào để cập nhật')
    }

    const result = await this.executeInTransaction(async (trx) => {
      // 1. Load project with lock (prevents concurrent updates)
      const project = await this.projects.findForUpdate(dto.project_id, trx)

      // 2. Check permissions via pure rule
      await this.actorLookup.findProjectActor(userId, trx)
      const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
        {
          organizationId: project.organization_id,
          actorUserId: userId,
        },
        trx
      )
      const projectMember = await this.memberships.findMember(dto.project_id, userId, trx)
      const actorProjectRole = projectMember?.projectRole ?? null

      const fieldResult = canUpdateProjectFields(
        {
          actorId: userId,
          actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
          actorProjectRole,
          projectCreatorId: project.creator_id,
          projectOwnerId: project.owner_id ?? '',
          projectOrganizationId: project.organization_id,
        },
        dto.getUpdatedFields()
      )
      enforcePolicy(fieldResult)

      // 3. Store old values for audit
      const oldValues = this.getTrackedFields(project)

      // 4. Update project fields
      const updateData = dto.toObject()
      const updatedProject = await this.projects.update(project.id, updateData, trx)

      // 5. Get new values
      const newValues = this.getTrackedFields(updatedProject)

      // 6. Log audit trail for each changed field
      await this.logFieldChanges(project.id, oldValues, newValues, dto.getUpdatedFields(), trx)
      if (!updatedProject.updated_at) {
        throw new InvariantViolationException(
          'Persisted project is missing its update timestamp'
        )
      }
      await this.lifecycleEvents.stage({
        mutationId: lifecycleMutationId,
        action: 'updated',
        projectId: updatedProject.id,
        organizationId: updatedProject.organization_id,
        actorId: userId,
        projectName: null,
        occurredAt: updatedProject.updated_at,
      }, trx)

      return {
        project: updatedProject,
      }
    })

    await this.settlePostCommitEffect(
      'project.cache_metadata.invalidated',
      () => this.taskCache.invalidateTaskCollectionMetadata(result.project.organization_id),
      {
        projectId: result.project.id,
        actorId: userId,
      },
      this.postCommitFailures
    )

    return result.project
  }

  /**
   * Get tracked field values for audit
   */
  private getTrackedFields(project: ProjectRecord): Record<string, unknown> {
    return {
      name: project.name,
      description: project.description,
      status: project.status,
      start_date: project.start_date,
      end_date: project.end_date,
      manager_id: project.manager_id,
      owner_id: project.owner_id,
      visibility: project.visibility,
    }
  }

  /**
   * Log changes for each updated field
   */
  private async logFieldChanges(
    projectId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    updatedFields: string[],
    trx: ProjectTransaction
  ): Promise<void> {
    for (const field of updatedFields) {
      if (oldValues[field] !== newValues[field]) {
        if (this.execCtx.userId) {
          await this.projectAuditEventPublisher.publishProjectAudit(
            this.execCtx,
            {
              action: 'update',
              entityId: projectId,
              oldValues: { [field]: oldValues[field] },
              newValues: {
                [field]: newValues[field],
              },
            },
            trx
          )
        }
      }
    }
  }
}
