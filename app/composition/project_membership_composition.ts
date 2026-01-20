import { OrganizationsProjectOrganizationAccessReaderAdapter } from './adapters/organizations_project_organization_access_reader_adapter.js'
import { ProjectMembershipObservabilityAdapter } from './adapters/project_membership_observability_adapter.js'
import { ProjectRoleStaffingReaderAdapter } from './adapters/project_role_staffing_reader_adapter.js'
import { ProjectTaskAssignmentInvariantAdapter } from './adapters/project_task_assignment_invariant_adapter.js'
import { UsersProjectActorLookupAdapter } from './adapters/users_project_actor_lookup_adapter.js'
import { ComposedProjectMembershipCommandFactory } from './factories/project_membership_command_factory.js'
import {
  projectLifecycleRepository,
  projectMembershipRepository,
  projectTransactionRunner,
} from './project_persistence_composition.js'
import { projectPostCommitFailureObserver } from './project_post_commit_observer_composition.js'

import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { InProcessProjectEventPublisher } from '#modules/projects/infra/adapters/in_process_project_event_publisher'

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
