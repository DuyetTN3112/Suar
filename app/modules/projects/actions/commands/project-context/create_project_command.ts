import type { CreateProjectDTO } from '../../dtos/request/create_project_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectAuditEventPublisher } from '#modules/projects/actions/ports/outbound/project_audit_event_publisher'
import type { ProjectIdentityGenerator } from '#modules/projects/actions/ports/outbound/project_identity_generator'
import type { ProjectLifecycleEventStager } from '#modules/projects/actions/ports/outbound/project_lifecycle_event_stager'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectOrganizationAccessReader } from '#modules/projects/actions/ports/outbound/project_organization_access'
import type { ProjectPermissionReader } from '#modules/projects/actions/ports/outbound/project_permission_reader'
import type { ProjectPostCommitFailureObserver } from '#modules/projects/actions/ports/outbound/project_post_commit_failure_observer'
import type { ProjectTaskCacheInvalidator } from '#modules/projects/actions/ports/outbound/project_task_cache_invalidator'
import type { ProjectTaskWorkflowInitializer } from '#modules/projects/actions/ports/outbound/project_task_workflow_initializer'
import type { ProjectTransactionRunner } from '#modules/projects/actions/ports/outbound/project_transaction'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import { canCreateProject } from '#modules/projects/domain/project-members/project_permission_policy'
import {
  validateProjectStatus,
  validateProjectDates,
} from '#modules/projects/domain/project-context/project_state_rules'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import type { ProjectDetailRecord } from '#modules/projects/types/project_records'

/**
 * Command to create a new project
 *
 * Di chuyển logic từ database triggers:
 * - before_insert_project: Check permission can_create_project, set owner_id, manager_id
 * - after_project_insert: Add owner to project_members với project_role_id = 1
 *
 * Business Rules:
 * - Check permission can_create_project (từ trigger before_insert_project)
 * - Owner mặc định là creator
 * - Manager mặc định là owner
 * - Creator tự động thành project_members với role owner (project_role_id = 1)
 *
 * @extends {BaseCommand<CreateProjectDTO, ProjectDetailRecord>}
 */
export default class CreateProjectCommand extends BaseCommand<
  CreateProjectDTO,
  ProjectDetailRecord
> {
  constructor(
    execCtx: ProjectActionContext,
    transactionRunner: ProjectTransactionRunner,
    private readonly projects: ProjectLifecycleRepository,
    private readonly memberships: ProjectMembershipRepository,
    private readonly identities: ProjectIdentityGenerator,
    private readonly lifecycleEvents: ProjectLifecycleEventStager,
    private readonly taskCache: ProjectTaskCacheInvalidator,
    private readonly permissionReader: ProjectPermissionReader,
    private readonly organizationAccessReader: ProjectOrganizationAccessReader,
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher,
    private readonly postCommitFailures?: ProjectPostCommitFailureObserver,
    private readonly taskWorkflow?: ProjectTaskWorkflowInitializer
  ) {
    super(execCtx, transactionRunner)
  }

  async handle(dto: CreateProjectDTO): Promise<ProjectDetailRecord> {
    const userId = this.getCurrentUserId()
    const lifecycleMutationId = this.identities.generate()

    const result = await this.executeInTransaction(async (trx) => {
      // 1. Check permission can_create_project (logic từ procedure)
      const hasPermission = await this.permissionReader.checkOrganizationPermission({
        actorUserId: userId,
        organizationId: dto.organization_id,
        permission: 'can_create_project',
        trx,
      })

      enforcePolicy(
        canCreateProject({
          isOrgAdminOrOwner: hasPermission,
        })
      )

      // 2. v3: Validate status via pure rule
      if (dto.status) {
        enforcePolicy(validateProjectStatus(dto.status))
      }

      // 3. Validate dates via pure rule
      if (dto.start_date && dto.end_date) {
        enforcePolicy(
          validateProjectDates({
            startDate: dto.start_date.toISO() ?? null,
            endDate: dto.end_date.toISO() ?? null,
          })
        )
      }

      // 4. Every project actor belongs to the User/Organization realm.
      await this.organizationAccessReader.ensureApprovedMember(dto.organization_id, userId, trx)

      // 5. Set owner_id and manager_id
      const ownerId = userId
      const managerId = dto.manager_id ?? ownerId

      // 6. Create the project
      const project = await this.projects.create(
        {
          name: dto.name,
          description: dto.description ?? null,
          organization_id: dto.organization_id,
          creator_id: userId,
          owner_id: ownerId,
          manager_id: managerId,
          status: dto.status,
          visibility: dto.visibility,
          business_domains: dto.business_domains,
          start_date: dto.start_date ?? null,
          end_date: dto.end_date ?? null,
        },
        trx
      )

      // 7. Add owner as project member (from trigger)
      await this.memberships.addMember(project.id, ownerId, ProjectRole.OWNER, null, trx)

      // Every project starts with an independent status catalogue. The org may
      // govern who can manage it, but it never shares board columns with a
      // sibling project.
      if (this.taskWorkflow) {
        await this.taskWorkflow.seedDefaultStatusesForProject(dto.organization_id, project.id, trx)
      }

      await this.projectAuditEventPublisher.publishProjectAudit(
        this.execCtx,
        {
          action: 'create',
          entityId: project.id,
          oldValues: null,
          newValues: project,
        },
        trx
      )

      const detail = await this.projects.findDetail(project.id, trx)
      if (!detail.created_at) {
        throw new InvariantViolationException('Persisted project is missing its creation timestamp')
      }
      await this.lifecycleEvents.stage(
        {
          mutationId: lifecycleMutationId,
          action: 'created',
          projectId: detail.id,
          organizationId: detail.organization_id,
          actorId: userId,
          projectName: detail.name,
          occurredAt: detail.created_at,
        },
        trx
      )
      return detail
    })

    await this.settlePostCommitEffect(
      'project.cache_metadata.invalidated',
      () => this.taskCache.invalidateTaskCollectionMetadata(result.organization_id),
      {
        projectId: result.id,
        actorId: userId,
      },
      this.postCommitFailures
    )

    return result
  }
}
