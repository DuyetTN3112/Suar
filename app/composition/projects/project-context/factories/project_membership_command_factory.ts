import AddProjectMemberCommand from '#modules/projects/actions/commands/project-members/add_project_member_command'
import RemoveProjectMemberCommand from '#modules/projects/actions/commands/project-members/remove_project_member_command'
import UpdateProjectMemberCommand from '#modules/projects/actions/commands/project-members/update_project_member_command'
import { ProjectMembershipCommandFactory } from '#modules/projects/actions/ports/inbound/project_membership_command_factory'
import type { ProjectActorLookup } from '#modules/projects/actions/ports/outbound/project_actor_lookup'
import type { ProjectAuditEventPublisher } from '#modules/projects/actions/ports/outbound/project_audit_event_publisher'
import type { ProjectEventPublisher } from '#modules/projects/actions/ports/outbound/project_event_publisher'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipObservability } from '#modules/projects/actions/ports/outbound/project_membership_observability'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectOrganizationAccessReader } from '#modules/projects/actions/ports/outbound/project_organization_access'
import type { ProjectPostCommitFailureObserver } from '#modules/projects/actions/ports/outbound/project_post_commit_failure_observer'
import type { ProjectRoleStaffingReader } from '#modules/projects/actions/ports/outbound/project_role_staffing_reader'
import type { ProjectTaskAssignmentInvariant } from '#modules/projects/actions/ports/outbound/project_task_assignment_invariant'
import type { ProjectTransactionRunner } from '#modules/projects/actions/ports/outbound/project_transaction'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'

export class ComposedProjectMembershipCommandFactory extends ProjectMembershipCommandFactory {
  constructor(
    private readonly transactionRunner: ProjectTransactionRunner,
    private readonly projects: ProjectLifecycleRepository,
    private readonly memberships: ProjectMembershipRepository,
    private readonly taskAssignmentInvariant: ProjectTaskAssignmentInvariant,
    private readonly actorLookup: ProjectActorLookup,
    private readonly organizationAccess: ProjectOrganizationAccessReader,
    private readonly projectEvents: ProjectEventPublisher,
    private readonly auditEvents: ProjectAuditEventPublisher,
    private readonly membershipObservability: ProjectMembershipObservability,
    private readonly roleStaffing: ProjectRoleStaffingReader,
    private readonly postCommitFailures: ProjectPostCommitFailureObserver
  ) {
    super()
  }

  makeAddMember(context: ProjectActionContext): AddProjectMemberCommand {
    return new AddProjectMemberCommand(
      context,
      this.transactionRunner,
      this.projects,
      this.memberships,
      this.actorLookup,
      this.organizationAccess,
      this.roleStaffing,
      this.projectEvents,
      this.auditEvents,
      this.postCommitFailures
    )
  }

  makeUpdateMember(context: ProjectActionContext): UpdateProjectMemberCommand {
    return new UpdateProjectMemberCommand(
      context,
      this.transactionRunner,
      this.projects,
      this.memberships,
      this.actorLookup,
      this.organizationAccess,
      this.roleStaffing,
      this.projectEvents,
      this.auditEvents,
      this.postCommitFailures
    )
  }

  makeRemoveMember(context: ProjectActionContext): RemoveProjectMemberCommand {
    return new RemoveProjectMemberCommand(
      context,
      this.transactionRunner,
      this.projects,
      this.memberships,
      this.taskAssignmentInvariant,
      this.actorLookup,
      this.organizationAccess,
      this.projectEvents,
      this.auditEvents,
      this.membershipObservability,
      this.postCommitFailures
    )
  }
}
