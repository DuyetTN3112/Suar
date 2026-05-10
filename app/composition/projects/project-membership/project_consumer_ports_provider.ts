import type { ApplicationService } from '@adonisjs/core/types'

import { InertiaProjectDirectoryAdapter } from '#composition/adapters/projects/project-context/inertia_project_directory_adapter'
import { ProjectDetailReaderAdapter } from '#composition/adapters/projects/project_detail_reader_adapter'
import { ProjectListReaderAdapter } from '#composition/adapters/projects/project_list_reader_adapter'
import { ProjectOrganizationReaderAdapter } from '#composition/adapters/projects/project_organization_reader_adapter'
import { ProjectRoleStaffingReaderAdapter } from '#composition/adapters/projects/project_role_staffing_reader_adapter'
import { ProjectSwitchTargetReaderAdapter } from '#composition/adapters/projects/project_switch_target_reader_adapter'
import { ProjectTaskReaderWriterAdapter } from '#composition/adapters/projects/project_task_reader_writer_adapter'
import { ProjectTaskStatsReaderAdapter } from '#composition/adapters/projects/project_task_stats_reader_adapter'
import { ProjectUserReaderAdapter } from '#composition/adapters/projects/project_user_reader_adapter'
import { ProjectWorkspaceAccessReaderAdapter } from '#composition/adapters/projects/project_workspace_access_reader_adapter'
import { SkillsProjectAccessAuthorizerAdapter } from '#composition/adapters/skills/skills_project_access_authorizer_adapter'
import { SkillsProjectRoleCatalogWriterAdapter } from '#composition/adapters/skills/skills_project_role_catalog_writer_adapter'
import { UserWorkHistoryReaderAdapter } from '#composition/adapters/users/user_work_history_reader_adapter'
import { ComposedSkillProjectActionFactory } from '#composition/factories/composed_skill_project_action_factory'
import { ComposedOrganizationProjectDetailQueryFactory } from '#composition/organizations/projects/factories/organization_project_action_factories'
import { projectContextFactReader } from '#composition/projects/project-context/project_context_fact_reader_composition'
import {
  projectDetailProjectionReader,
  projectLifecycleRepository,
  projectMembershipRepository,
} from '#composition/projects/project-membership/project_persistence_composition'
import {
  addProjectRoleSkillCommand,
  addProjectSkillCommand,
  cloneProfessionalRoleTemplateCommand,
  createCustomProjectRoleCommand,
  projectSkillTaskMetadataCache,
  deactivateProjectRoleCommand,
  deactivateProjectSkillCommand,
  listProjectRolesQuery,
  listProjectSkillsQuery,
  removeProjectRoleSkillCommand,
  resolveCustomSkillCommand,
  skillTransactionRunner,
  updateProjectRoleSkillCommand,
  updateProjectSkillCommand,
} from '#composition/skills/skill-application/skills_application_composition'
import { taskUserReader } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import { InertiaProjectDirectory } from '#modules/http/actions/ports/outbound/inertia_project_directory'
import { OrganizationProjectDetailQueryFactory } from '#modules/organizations/actions/ports/inbound/projects/organization_project_detail_query_factory'
import { OrganizationProjectDetailReader } from '#modules/organizations/actions/ports/outbound/projects/organization_project_detail_reader'
import { ProjectDetailReader } from '#modules/projects/actions/ports/outbound/project_detail_reader'
import {
  ProjectOrganizationReader,
  ProjectTaskReaderWriter,
  ProjectUserReader,
} from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import { ProjectListReader } from '#modules/projects/actions/ports/outbound/project_list_reader'
import { ProjectRoleCatalogWriter } from '#modules/projects/actions/ports/outbound/project_role_catalog_writer'
import { ProjectRoleStaffingReader } from '#modules/projects/actions/ports/outbound/project_role_staffing_reader'
import { ProjectSwitchTargetReader } from '#modules/projects/actions/ports/outbound/project_switch_target_reader'
import { ProjectTaskStatsReader } from '#modules/projects/actions/ports/outbound/project_task_stats_reader'
import { ProjectWorkspaceAccessReader } from '#modules/projects/actions/ports/outbound/project_workspace_access_reader'
import AuthorizeSkillProjectAccessCommand from '#modules/skills/actions/commands/project-skills/authorize_skill_project_access_command'
import { SkillProjectActionFactory } from '#modules/skills/actions/ports/inbound/skill_project_action_factory'
import { SkillProjectAccessAuthorizer } from '#modules/skills/actions/ports/outbound/skill_project_access_authorizer'
import { UserWorkHistoryReader } from '#modules/users/actions/ports/outbound/user_work_history_reader'

export default class ProjectConsumerPortsProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    const organizationReader = new ProjectOrganizationReaderAdapter()
    const workspaceAccessReader = new ProjectWorkspaceAccessReaderAdapter()
    const taskReader = new ProjectTaskReaderWriterAdapter(taskUserReader)
    const userReader = new ProjectUserReaderAdapter()
    const detailReader = new ProjectDetailReaderAdapter(
      taskReader,
      projectLifecycleRepository,
      projectMembershipRepository,
      projectDetailProjectionReader,
      projectContextFactReader
    )
    const skillProjectAccessAuthorizer = new SkillsProjectAccessAuthorizerAdapter(
      organizationReader,
      projectLifecycleRepository,
      projectMembershipRepository
    )
    const authorizeSkillProjectAccess = new AuthorizeSkillProjectAccessCommand(
      skillProjectAccessAuthorizer
    )

    this.app.container.singleton(ProjectOrganizationReader, () => organizationReader)
    this.app.container.singleton(ProjectTaskReaderWriter, () => taskReader)
    this.app.container.singleton(ProjectTaskStatsReader, () => new ProjectTaskStatsReaderAdapter())
    this.app.container.singleton(ProjectUserReader, () => userReader)
    this.app.container.singleton(ProjectDetailReader, () => detailReader)
    this.app.container.singleton(ProjectListReader, () => new ProjectListReaderAdapter())
    this.app.container.singleton(
      ProjectRoleStaffingReader,
      () => new ProjectRoleStaffingReaderAdapter()
    )
    this.app.container.singleton(
      ProjectRoleCatalogWriter,
      () => new SkillsProjectRoleCatalogWriterAdapter()
    )
    this.app.container.singleton(
      ProjectSwitchTargetReader,
      () => new ProjectSwitchTargetReaderAdapter()
    )
    this.app.container.singleton(OrganizationProjectDetailReader, () => detailReader)
    this.app.container.singleton(
      OrganizationProjectDetailQueryFactory,
      () => new ComposedOrganizationProjectDetailQueryFactory(detailReader)
    )
    this.app.container.singleton(
      InertiaProjectDirectory,
      () => new InertiaProjectDirectoryAdapter()
    )
    this.app.container.singleton(ProjectWorkspaceAccessReader, () => workspaceAccessReader)
    this.app.container.singleton(SkillProjectAccessAuthorizer, () => skillProjectAccessAuthorizer)
    this.app.container.singleton(
      AuthorizeSkillProjectAccessCommand,
      () => authorizeSkillProjectAccess
    )
    this.app.container.singleton(
      SkillProjectActionFactory,
      () =>
        new ComposedSkillProjectActionFactory(
          authorizeSkillProjectAccess,
          listProjectSkillsQuery,
          listProjectRolesQuery,
          addProjectSkillCommand,
          updateProjectSkillCommand,
          deactivateProjectSkillCommand,
          cloneProfessionalRoleTemplateCommand,
          createCustomProjectRoleCommand,
          deactivateProjectRoleCommand,
          removeProjectRoleSkillCommand,
          addProjectRoleSkillCommand,
          updateProjectRoleSkillCommand,
          resolveCustomSkillCommand,
          skillTransactionRunner,
          projectSkillTaskMetadataCache
        )
    )
    this.app.container.singleton(UserWorkHistoryReader, () => new UserWorkHistoryReaderAdapter())
  }
}
