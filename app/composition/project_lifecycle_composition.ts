import { AuthorizationProjectPermissionReaderAdapter } from './adapters/authorization_project_permission_reader_adapter.js'
import { DomainEventProjectLifecycleEventStagerAdapter } from './adapters/domain_event_project_lifecycle_event_stager_adapter.js'
import { OrganizationsProjectOrganizationAccessReaderAdapter } from './adapters/organizations_project_organization_access_reader_adapter.js'
import { ProjectTaskCacheInvalidatorAdapter } from './adapters/project_task_cache_invalidator_adapter.js'
import { ProjectTaskStatsReaderAdapter } from './adapters/project_task_stats_reader_adapter.js'
import { SkillsProjectRoleCatalogWriterAdapter } from './adapters/skills_project_role_catalog_writer_adapter.js'
import { UsersProjectActorLookupAdapter } from './adapters/users_project_actor_lookup_adapter.js'
import { ComposedProjectLifecycleCommandFactory } from './factories/project_lifecycle_command_factory.js'
import { projectMembershipCommandFactory } from './project_membership_composition.js'
import {
  projectIdentityGenerator,
  projectLifecycleRepository,
  projectMembershipRepository,
  projectTransactionRunner,
} from './project_persistence_composition.js'
import { projectPostCommitFailureObserver } from './project_post_commit_observer_composition.js'

import { AuditEventProjectAuditEventPublisher } from '#modules/projects/infra/adapters/audit_event_project_audit_event_publisher'
import { TaskCacheInvalidator } from '#modules/tasks/infra/cache/task_cache_invalidator'

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
  projectPostCommitFailureObserver
)
