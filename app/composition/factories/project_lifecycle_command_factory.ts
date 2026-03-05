import CreateProjectCommand from '#modules/projects/actions/commands/create_project_command'
import CreateProjectWithStaffingCommand from '#modules/projects/actions/commands/create_project_with_staffing_command'
import DeleteProjectCommand from '#modules/projects/actions/commands/delete_project_command'
import UpdateProjectCommand from '#modules/projects/actions/commands/update_project_command'
import { ProjectLifecycleCommandFactory } from '#modules/projects/actions/ports/inbound/project_lifecycle_command_factory'
import type { ProjectMembershipCommandFactory } from '#modules/projects/actions/ports/inbound/project_membership_command_factory'
import type { ProjectActorLookup } from '#modules/projects/actions/ports/outbound/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/actions/ports/outbound/project_audit_event_publisher'
import type { ProjectIdentityGenerator } from '#modules/projects/actions/ports/outbound/project_identity_generator'
import type { ProjectLifecycleEventStager } from '#modules/projects/actions/ports/outbound/project_lifecycle_event_stager'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectOrganizationAccessReader } from '#modules/projects/actions/ports/outbound/project_organization_access'
import type { ProjectPermissionReader } from '#modules/projects/actions/ports/outbound/project_permission_reader'
import type { ProjectPostCommitFailureObserver } from '#modules/projects/actions/ports/outbound/project_post_commit_failure_observer'
import type { ProjectRoleCatalogWriter } from '#modules/projects/actions/ports/outbound/project_role_catalog_writer'
import type { ProjectTaskCacheInvalidator } from '#modules/projects/actions/ports/outbound/project_task_cache_invalidator'
import type { ProjectTaskStatsReader } from '#modules/projects/actions/ports/outbound/project_task_stats_reader'
import type { ProjectTransactionRunner } from '#modules/projects/actions/ports/outbound/project_transaction'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'

export class ComposedProjectLifecycleCommandFactory extends ProjectLifecycleCommandFactory {
  constructor(
    private readonly transactionRunner: ProjectTransactionRunner,
    private readonly projects: ProjectLifecycleRepository,
    private readonly memberships: ProjectMembershipRepository,
    private readonly identities: ProjectIdentityGenerator,
    private readonly lifecycleEvents: ProjectLifecycleEventStager,
    private readonly taskCache: ProjectTaskCacheInvalidator,
    private readonly taskStats: ProjectTaskStatsReader,
    private readonly permissionReader: ProjectPermissionReader,
    private readonly organizationAccess: ProjectOrganizationAccessReader,
    private readonly actorLookup: ProjectActorLookup,
    private readonly auditEvents: ProjectAuditEventPublisher,
    private readonly membershipCommands: ProjectMembershipCommandFactory,
    private readonly roleCatalog: ProjectRoleCatalogWriter,
    private readonly postCommitFailures: ProjectPostCommitFailureObserver
  ) {
    super()
  }

  makeCreate(context: ProjectActionContext): CreateProjectCommand {
    return new CreateProjectCommand(
      context,
      this.transactionRunner,
      this.projects,
      this.memberships,
      this.identities,
      this.lifecycleEvents,
      this.taskCache,
      this.permissionReader,
      this.organizationAccess,
      this.auditEvents,
      this.postCommitFailures
    )
  }

  makeCreateWithStaffing(context: ProjectActionContext): CreateProjectWithStaffingCommand {
    return new CreateProjectWithStaffingCommand(
      context,
      this.makeCreate(context),
      this.membershipCommands.makeAddMember(context),
      this.membershipCommands.makeUpdateMember(context),
      this.roleCatalog,
      this.memberships
    )
  }

  makeUpdate(context: ProjectActionContext): UpdateProjectCommand {
    return new UpdateProjectCommand(
      context,
      this.transactionRunner,
      this.projects,
      this.memberships,
      this.identities,
      this.lifecycleEvents,
      this.taskCache,
      this.actorLookup,
      this.organizationAccess,
      this.auditEvents,
      this.postCommitFailures
    )
  }

  makeDelete(context: ProjectActionContext): DeleteProjectCommand {
    return new DeleteProjectCommand(
      context,
      this.transactionRunner,
      this.projects,
      this.identities,
      this.lifecycleEvents,
      this.taskStats,
      this.taskCache,
      this.actorLookup,
      this.organizationAccess,
      this.auditEvents,
      this.postCommitFailures
    )
  }
}
