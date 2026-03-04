import type { ApplicationService } from '@adonisjs/core/types'

import { InertiaProjectDirectoryAdapter } from './adapters/inertia_project_directory_adapter.js'
import { ProjectDetailReaderAdapter } from './adapters/project_detail_reader_adapter.js'
import { ProjectListReaderAdapter } from './adapters/project_list_reader_adapter.js'
import { ProjectOrganizationReaderAdapter } from './adapters/project_organization_reader_adapter.js'
import { ProjectRoleStaffingReaderAdapter } from './adapters/project_role_staffing_reader_adapter.js'
import { ProjectSwitchTargetReaderAdapter } from './adapters/project_switch_target_reader_adapter.js'
import { ProjectTaskReaderWriterAdapter } from './adapters/project_task_reader_writer_adapter.js'
import { ProjectTaskStatsReaderAdapter } from './adapters/project_task_stats_reader_adapter.js'
import { ProjectUserReaderAdapter } from './adapters/project_user_reader_adapter.js'
import { ProjectWorkspaceAccessReaderAdapter } from './adapters/project_workspace_access_reader_adapter.js'
import { SkillsProjectAccessAuthorizerAdapter } from './adapters/skills_project_access_authorizer_adapter.js'
import { SkillsProjectRoleCatalogWriterAdapter } from './adapters/skills_project_role_catalog_writer_adapter.js'
import { UserWorkHistoryReaderAdapter } from './adapters/user_work_history_reader_adapter.js'
import { ComposedOrganizationProjectDetailQueryFactory } from './factories/organization_project_action_factories.js'

import {
  projectDetailProjectionReader,
  projectLifecycleRepository,
  projectMembershipRepository,
} from '#composition/project_persistence_composition'
import { taskUserReader } from '#composition/task_external_dependencies_composition'
import { InertiaProjectDirectory } from '#modules/http/actions/ports/outbound/inertia_project_directory'
import { OrganizationProjectDetailQueryFactory } from '#modules/organizations/projects/actions/ports/inbound/organization_project_detail_query_factory'
import { OrganizationProjectDetailReader } from '#modules/organizations/projects/actions/ports/outbound/organization_project_detail_reader'
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
import AuthorizeSkillProjectAccessCommand from '#modules/skills/actions/commands/authorize_skill_project_access_command'
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
      projectDetailProjectionReader
    )
    const skillProjectAccessAuthorizer = new SkillsProjectAccessAuthorizerAdapter(
      organizationReader,
      projectLifecycleRepository,
      projectMembershipRepository
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
    this.app.container.singleton(
      SkillProjectAccessAuthorizer,
      () => skillProjectAccessAuthorizer
    )
    this.app.container.singleton(
      AuthorizeSkillProjectAccessCommand,
      () => new AuthorizeSkillProjectAccessCommand(skillProjectAccessAuthorizer)
    )
    this.app.container.singleton(UserWorkHistoryReader, () => new UserWorkHistoryReaderAdapter())
  }
}
