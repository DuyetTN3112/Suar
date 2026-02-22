import type { DeleteProjectDTO } from '../dtos/request/delete_project_dto.js'

import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import { PolicyResult as PR } from '#modules/authorization/public_contracts/policy_result'
import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type { ProjectActorLookup } from '#modules/projects/application/ports/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/application/ports/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type { ProjectOrganizationAccessReader } from '#modules/projects/application/ports/project_organization_access'
import type { ProjectTaskStatsReader } from '#modules/projects/application/ports/project_task_stats_reader'
import { canDeleteProject } from '#modules/projects/domain/project_permission_policy'
import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'
import { OrganizationPublicApiProjectOrganizationAccessReader } from '#modules/projects/infra/adapters/organization_public_api_project_organization_access_reader'
import { TasksPublicApiProjectTaskStatsReader } from '#modules/projects/infra/adapters/tasks_public_api_project_task_stats_reader'
import { UsersPublicApiProjectActorLookup } from '#modules/projects/infra/adapters/users_public_api_project_actor_lookup'
import * as projectMutations from '#modules/projects/infra/repositories/write/project_mutations'

/**
 * Command to delete a project (soft delete by default)
 *
 * Business Rules:
 * - Only owner or superadmin can delete projects
 * - Warns if project has incomplete tasks
 * - Soft delete by default (sets deleted_at timestamp)
 * - Permanent delete option available (use with caution)
 *
 * @extends {BaseCommand<DeleteProjectDTO, void>}
 */
export default class DeleteProjectCommand extends BaseCommand<DeleteProjectDTO> {
  constructor(
    execCtx: ProjectActionContext,
    private readonly taskStatsReader: ProjectTaskStatsReader = new TasksPublicApiProjectTaskStatsReader(),
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
   * @param dto - Validated DeleteProjectDTO
   */
  async handle(dto: DeleteProjectDTO): Promise<void> {
    const userId = this.getCurrentUserId()

    const deletedProjectEvent = await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await projectMutations.findActiveForUpdateRecord(dto.project_id, trx)

      // Optional scope guard for adapters that require current organization context.
      if (dto.current_organization_id && project.organization_id !== dto.current_organization_id) {
        enforcePolicy(PR.deny('Dự án không thuộc tổ chức hiện tại'))
      }

      // 2. Check permissions and incomplete tasks via pure rule
      const user = await this.actorLookup.findProjectActor(userId, trx)
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
          actorSystemRole: user?.systemRole ?? null,
          actorOrgRole: organizationAccess?.actorOrganizationRole ?? null,
          projectOwnerId: project.owner_id ?? '',
          projectCreatorId: project.creator_id,
          incompleteTaskCount: taskStats.incompleteTasks,
        })
      )

      // 4. Store old values for audit
      const oldValues = { ...project }

      // 5. Perform delete (soft or permanent)
      const deletedProject = dto.isPermanentDelete()
        ? await projectMutations.hardDeleteByIdRecord(project.id, trx)
        : await projectMutations.softDeleteByIdRecord(project.id, trx)

      await this.projectAuditEventPublisher.publishProjectAudit(this.execCtx, {
        action: 'delete',
        entityId: project.id,
        oldValues,
        newValues: {
          deleted_at: deletedProject.deleted_at,
          reason: dto.reason,
          permanent: dto.permanent,
        },
      })

      return {
        projectId: project.id,
        organizationId: project.organization_id,
      }
    })

    await this.projectEventPublisher.publishProjectDeleted({
      projectId: deletedProjectEvent.projectId,
      organizationId: deletedProjectEvent.organizationId,
      deletedBy: userId,
    })
  }
}
