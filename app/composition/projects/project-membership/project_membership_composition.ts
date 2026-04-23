import { OrganizationsProjectOrganizationAccessReaderAdapter } from '#composition/adapters/organizations/organizations_project_organization_access_reader_adapter'
import { ProjectMembershipObservabilityAdapter } from '#composition/adapters/observability/project_membership_observability_adapter'
import { ProjectRoleStaffingReaderAdapter } from '#composition/adapters/projects/project_role_staffing_reader_adapter'
import { ProjectTaskAssignmentInvariantAdapter } from '#composition/adapters/projects/project_task_assignment_invariant_adapter'
import { UsersProjectActorLookupAdapter } from '#composition/adapters/users/users_project_actor_lookup_adapter'
import { ComposedProjectMembershipCommandFactory } from '#composition/projects/project-context/factories/project_membership_command_factory'
import {
  projectLifecycleRepository,
  projectMembershipRepository,
  projectTransactionRunner,
} from '#composition/projects/project-membership/project_persistence_composition'
import { projectPostCommitFailureObserver } from '#composition/projects/project-lifecycle/project_post_commit_observer_composition'

import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/project-context/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/project-context/in_process_project_event_publisher'

export const projectMembershipCommandFactory = new ComposedProjectMembershipCommandFactory(
  projectTransactionRunner,
  projectLifecycleRepository,
  projectMembershipRepository,
  new ProjectTaskAssignmentInvariantAdapter(),
  new UsersProjectActorLookupAdapter(),
  new OrganizationsProjectOrganizationAccessReaderAdapter(),
  new InProcessProjectEventPublisher(),
  new AuditEventProjectAuditEventPublisher(),
  new ProjectMembershipObservabilityAdapter(),
  new ProjectRoleStaffingReaderAdapter(),
  projectPostCommitFailureObserver
)
