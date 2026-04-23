import { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'
import type { ProjectContextFactReader } from '#modules/projects/actions/ports/outbound/project-context/project_context_fact_reader'
import type { ProjectAuditActivityReader } from '#modules/projects/actions/ports/outbound/project_audit_activity_reader'
import type { ProjectDetailProjectionReader } from '#modules/projects/actions/ports/outbound/project_detail_projection_reader'
import type {
  ProjectOrganizationReader,
  ProjectTaskReaderWriter,
  ProjectUserReader,
} from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectListRepository } from '#modules/projects/actions/ports/outbound/project_list_repository'
import type { ProjectMemberCandidateReader } from '#modules/projects/actions/ports/outbound/project_member_candidate_reader'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectReverseReviewReader } from '#modules/projects/actions/ports/outbound/project_reverse_review_reader'
import type { ProjectRoleStaffingReader } from '#modules/projects/actions/ports/outbound/project_role_staffing_reader'
import type { ProjectSearchCandidateReader } from '#modules/projects/actions/ports/outbound/project_search_candidate_reader'
import type { ProjectSwitchTargetReader } from '#modules/projects/actions/ports/outbound/project_switch_target_reader'
import type { ProjectTaskStatsReader } from '#modules/projects/actions/ports/outbound/project_task_stats_reader'
import type { WorkPackageCatalogReader } from '#modules/projects/actions/ports/outbound/work_package_catalog_reader'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import GetProjectCreatePageQuery from '#modules/projects/actions/queries/project-context/get_project_create_page_query'
import GetProjectDetailQuery from '#modules/projects/actions/queries/project-context/get_project_detail_query'
import GetProjectSwitchTargetQuery from '#modules/projects/actions/queries/project-context/get_project_switch_target_query'
import GetProjectTaskAuthoringContextQuery from '#modules/projects/actions/queries/project-context/get_project_task_authoring_context_query'
import GetProjectsIndexQuery from '#modules/projects/actions/queries/project-context/get_projects_index_query'
import GetProjectsListQuery from '#modules/projects/actions/queries/project-context/get_projects_list_query'
import GetProjectMemberCandidatesQuery from '#modules/projects/actions/queries/project-members/get_project_member_candidates_query'
import GetRoleStaffingCandidatesQuery from '#modules/projects/actions/queries/project-members/get_role_staffing_candidates_query'
import GetUserProjectAccessQuery from '#modules/projects/actions/queries/project-members/get_user_project_access_query'

export interface ComposedProjectQueryFactoryDependencies {
  auditActivityReader: ProjectAuditActivityReader
  projectContextFactReader?: ProjectContextFactReader
  workPackageCatalogReader: WorkPackageCatalogReader
  detailProjection: ProjectDetailProjectionReader
  organizationReader: ProjectOrganizationReader
  projectMemberCandidateReader: ProjectMemberCandidateReader
  projects: ProjectLifecycleRepository
  projectList: ProjectListRepository
  memberships: ProjectMembershipRepository
  reverseReviews: ProjectReverseReviewReader
  roleStaffing: ProjectRoleStaffingReader
  searchCandidates: ProjectSearchCandidateReader
  switchTargets: ProjectSwitchTargetReader
  taskReader: ProjectTaskReaderWriter
  taskStats: ProjectTaskStatsReader
  userReader: ProjectUserReader
}

export class ComposedProjectQueryFactory extends ProjectQueryFactory {
  constructor(private readonly dependencies: ComposedProjectQueryFactoryDependencies) {
    super()
  }

  makeCreatePage(context: ProjectActionContext): GetProjectCreatePageQuery {
    return new GetProjectCreatePageQuery(context, this.dependencies.organizationReader)
  }

  makeDetail(context: ProjectActionContext): GetProjectDetailQuery {
    return new GetProjectDetailQuery(
      context,
      this.dependencies.auditActivityReader,
      this.dependencies.organizationReader,
      this.dependencies.taskReader,
      this.dependencies.userReader,
      this.dependencies.reverseReviews,
      this.dependencies.projects,
      this.dependencies.memberships,
      this.dependencies.detailProjection,
      this.dependencies.projectContextFactReader
    )
  }

  override makeTaskAuthoringContext(context: ProjectActionContext): GetProjectTaskAuthoringContextQuery {
    return new GetProjectTaskAuthoringContextQuery(
      context,
      new GetUserProjectAccessQuery(
        this.dependencies.organizationReader,
        this.dependencies.projects,
        this.dependencies.memberships
      ),
      this.dependencies.projectContextFactReader ?? {
        readProjectContextFact: () => Promise.resolve(null),
      },
      this.dependencies.workPackageCatalogReader
    )
  }

  makeMemberCandidates(context: ProjectActionContext): GetProjectMemberCandidatesQuery {
    return new GetProjectMemberCandidatesQuery(
      context,
      this.dependencies.organizationReader,
      this.dependencies.userReader,
      this.dependencies.projects,
      this.dependencies.memberships,
      this.dependencies.projectMemberCandidateReader
    )
  }

  makeProjectsIndex(context: ProjectActionContext): GetProjectsIndexQuery {
    return new GetProjectsIndexQuery(
      context,
      this.dependencies.organizationReader,
      new GetProjectsListQuery(
        context,
        this.dependencies.taskStats,
        this.dependencies.projectList,
        this.dependencies.memberships,
        this.dependencies.searchCandidates
      )
    )
  }

  makeSwitchTarget(_context: ProjectActionContext): GetProjectSwitchTargetQuery {
    return new GetProjectSwitchTargetQuery(this.dependencies.switchTargets)
  }

  makeRoleStaffingCandidates(context: ProjectActionContext): GetRoleStaffingCandidatesQuery {
    return new GetRoleStaffingCandidatesQuery(
      context,
      new GetUserProjectAccessQuery(
        this.dependencies.organizationReader,
        this.dependencies.projects,
        this.dependencies.memberships
      ),
      this.dependencies.roleStaffing
    )
  }
}
