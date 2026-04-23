import { AuthorizationProjectPermissionReaderAdapter } from '#composition/adapters/authorization/authorization_project_permission_reader_adapter'
import { DomainEventProjectLifecycleEventStagerAdapter } from '#composition/adapters/events/domain_event_project_lifecycle_event_stager_adapter'
import { OrganizationsProjectOrganizationAccessReaderAdapter } from '#composition/adapters/organizations/organizations_project_organization_access_reader_adapter'
import { ProjectTaskCacheInvalidatorAdapter } from '#composition/adapters/cache/project_task_cache_invalidator_adapter'
import { ProjectTaskStatsReaderAdapter } from '#composition/adapters/projects/project_task_stats_reader_adapter'
import { SkillsProjectRoleCatalogWriterAdapter } from '#composition/adapters/skills/skills_project_role_catalog_writer_adapter'
import { UsersProjectActorLookupAdapter } from '#composition/adapters/users/users_project_actor_lookup_adapter'
import { ComposedProjectLifecycleCommandFactory } from '#composition/projects/project-context/factories/project_lifecycle_command_factory'
import { projectMembershipCommandFactory } from '#composition/projects/project-membership/project_membership_composition'
import {
  projectIdentityGenerator,
  projectLifecycleRepository,
  projectMembershipRepository,
  projectTransactionRunner,
} from '#composition/projects/project-membership/project_persistence_composition'
import { projectPostCommitFailureObserver } from '#composition/projects/project-lifecycle/project_post_commit_observer_composition'
import { ProjectTaskWorkflowInitializerAdapter } from '#composition/projects/project-lifecycle/adapters/project_task_workflow_initializer_adapter'

import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/project-context/audit_event_project_audit_event_publisher'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'

export const projectTaskCacheInvalidator = new ProjectTaskCacheInvalidatorAdapter(
  new TaskCacheInvalidator()
)

export const projectLifecycleCommandFactory = new ComposedProjectLifecycleCommandFactory(
  projectTransactionRunner,
  projectLifecycleRepository,
  projectMembershipRepository,
  projectIdentityGenerator,
  new DomainEventProjectLifecycleEventStagerAdapter(),
  projectTaskCacheInvalidator,
  new ProjectTaskStatsReaderAdapter(),
  new AuthorizationProjectPermissionReaderAdapter(),
  new OrganizationsProjectOrganizationAccessReaderAdapter(),
  new UsersProjectActorLookupAdapter(),
  new AuditEventProjectAuditEventPublisher(),
  projectMembershipCommandFactory,
  new SkillsProjectRoleCatalogWriterAdapter(),
  projectPostCommitFailureObserver,
  new ProjectTaskWorkflowInitializerAdapter()
)
