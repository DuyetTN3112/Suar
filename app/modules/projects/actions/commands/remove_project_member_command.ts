import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { RemoveProjectMemberDTO } from '../dtos/request/remove_project_member_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectActorLookup } from '#modules/projects/application/ports/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import type { ProjectTaskAssignmentInvariant } from '#modules/projects/application/ports/project_task_assignment_invariant'
import { canRemoveProjectMember } from '#modules/projects/domain/project_permission_policy'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { TasksPublicApiProjectTaskAssignmentInvariant } from '#modules/projects/infra/adapters/tasks_public_api_project_task_assignment_invariant'
import { UsersPublicApiProjectActorLookup } from '#modules/projects/infra/adapters/users_public_api_project_actor_lookup'
import * as projectMemberQueries from '#modules/projects/infra/repositories/read/project_member_queries'
import * as projectModelQueries from '#modules/projects/infra/repositories/read/project_model_queries'
import * as projectMemberMutations from '#modules/projects/infra/repositories/write/project_member_mutations'

/**
 * Command to remove a member from a project
 *
 * Business Rules:
 * - Only owner or superadmin can remove members
 * - Cannot remove the owner
 * - Cannot remove the last superadmin
 * - Tasks assigned to removed member are reassigned to manager or specified user
 *
 * @extends {BaseCommand<RemoveProjectMemberDTO, void>}
 */
export default class RemoveProjectMemberCommand extends BaseCommand<RemoveProjectMemberDTO> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly taskAssignmentInvariant: ProjectTaskAssignmentInvariant = new TasksPublicApiProjectTaskAssignmentInvariant(),
    private readonly actorLookup: ProjectActorLookup = new UsersPublicApiProjectActorLookup(),
    private readonly organizationAccessReader: ProjectOrganizationAccessReader = new OrganizationPublicApiProjectOrganizationAccessReader(),
    private readonly projectEventPublisher: ProjectEventPublisher = new InProcessProjectEventPublisher(),
    private readonly projectAuditEventPublisher: ProjectAuditEventPublisher = new AuditEventProjectAuditEventPublisher()
  ) {
    super(execCtx)
  }

  /**
   * Execute the command
   *
   * @param dto - Validated RemoveProjectMemberDTO
   */
  async handle(dto: RemoveProjectMemberDTO): Promise<void> {
    const userId = this.getCurrentUserId()

    await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await projectModelQueries.findActiveOrFail(dto.project_id, trx)

      // 2. Check permissions via pure rule
      const actor = await this.actorLookup.findProjectActor(userId, trx)
      const organizationAccess = await this.organizationAccessReader.findOrganizationAccess(
        {
          organizationId: project.organization_id,
          actorUserId: userId,
        },
        trx
      )

      enforcePolicy(
        canRemoveProjectMember({
          actorId: userId,
          actorSystemRole: actor?.systemRole ?? null,
          actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
          projectOwnerId: project.owner_id ?? '',
          projectCreatorId: project.creator_id,
          targetUserId: dto.user_id,
        })
      )

      // 3. Load user to be removed (for audit log)
      const userToRemove = await this.actorLookup.findProjectActor(dto.user_id, trx)

      // 5. Get member role before removal
      const memberRole = await projectMemberQueries.getRoleName(dto.project_id, dto.user_id, trx)

      // 6. Reassign tasks if needed
      const reassignToUserId = dto.reassign_to ?? project.manager_id ?? project.owner_id
      if (reassignToUserId === null) {
        throw new BusinessLogicException(
          'Không thể phân công lại công việc - không có người dùng hợp lệ'
        )
      }
      await this.reassignTasks(dto.project_id, dto.user_id, reassignToUserId, userId, trx)

      // 7. Remove member
      await projectMemberMutations.deleteMember(dto.project_id, dto.user_id, trx)

      await this.projectAuditEventPublisher.publishProjectAudit(this.execCtx, {
        action: 'remove_member',
        entityId: project.id,
        oldValues: {
          user_id: dto.user_id,
          username: userToRemove?.username ?? null,
          role: memberRole,
        },
        newValues: {
          reason: dto.reason,
          reassigned_to: reassignToUserId,
        },
      })
    })

    await this.projectEventPublisher.publishProjectMemberRemoved({
      projectId: dto.project_id,
      userId: dto.user_id,
      removedBy: userId,
    })
  }

  /**
   * Reassign all tasks from removed member → delegate to Model
   */
  private async reassignTasks(
    projectId: string,
    fromUserId: string,
    toUserId: string,
    requestedByUserId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    await this.taskAssignmentInvariant.reassignOrUnassignTasksForRemovedMember({
      projectId,
      removedUserId: fromUserId,
      fallbackAssigneeUserId: toUserId,
      requestedByUserId,
      trx,
    })
  }
}
