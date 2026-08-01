import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type GetProjectCreatePageQuery from '#modules/projects/actions/queries/get_project_create_page_query'
import type GetProjectDetailQuery from '#modules/projects/actions/queries/get_project_detail_query'
import type GetProjectMemberCandidatesQuery from '#modules/projects/actions/queries/get_project_member_candidates_query'
import type GetProjectSwitchTargetQuery from '#modules/projects/actions/queries/get_project_switch_target_query'
import type GetProjectsIndexQuery from '#modules/projects/actions/queries/get_projects_index_query'
import type GetRoleStaffingCandidatesQuery from '#modules/projects/actions/queries/get_role_staffing_candidates_query'

/**
 * Runtime inbound contract for context-bound project queries.
 */
export abstract class ProjectQueryFactory {
  abstract makeCreatePage(context: ProjectActionContext): GetProjectCreatePageQuery
  abstract makeDetail(context: ProjectActionContext): GetProjectDetailQuery
  abstract makeMemberCandidates(context: ProjectActionContext): GetProjectMemberCandidatesQuery
  abstract makeSwitchTarget(context: ProjectActionContext): GetProjectSwitchTargetQuery
  abstract makeProjectsIndex(context: ProjectActionContext): GetProjectsIndexQuery
  abstract makeRoleStaffingCandidates(
    context: ProjectActionContext
  ): GetRoleStaffingCandidatesQuery
}
