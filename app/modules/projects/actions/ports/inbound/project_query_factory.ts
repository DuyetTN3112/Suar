import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type GetProjectCreatePageQuery from '#modules/projects/actions/queries/project-context/get_project_create_page_query'
import type GetProjectDetailQuery from '#modules/projects/actions/queries/project-context/get_project_detail_query'
import type GetProjectSwitchTargetQuery from '#modules/projects/actions/queries/project-context/get_project_switch_target_query'
import type GetProjectTaskAuthoringContextQuery from '#modules/projects/actions/queries/project-context/get_project_task_authoring_context_query'
import type GetProjectsIndexQuery from '#modules/projects/actions/queries/project-context/get_projects_index_query'
import type GetProjectMemberCandidatesQuery from '#modules/projects/actions/queries/project-members/get_project_member_candidates_query'
import type GetRoleStaffingCandidatesQuery from '#modules/projects/actions/queries/project-members/get_role_staffing_candidates_query'

/**
 * Runtime inbound contract for context-bound project queries.
 */
export abstract class ProjectQueryFactory {
  abstract makeCreatePage(context: ProjectActionContext): GetProjectCreatePageQuery
  abstract makeDetail(context: ProjectActionContext): GetProjectDetailQuery
  makeTaskAuthoringContext(_context: ProjectActionContext): GetProjectTaskAuthoringContextQuery {
    throw new Error('Task authoring context query is not configured')
  }
  abstract makeMemberCandidates(context: ProjectActionContext): GetProjectMemberCandidatesQuery
  abstract makeSwitchTarget(context: ProjectActionContext): GetProjectSwitchTargetQuery & { executeAndWrap: GetProjectSwitchTargetQuery['executeAndWrap'] }
  abstract makeProjectsIndex(context: ProjectActionContext): GetProjectsIndexQuery & { executeAndWrap: GetProjectsIndexQuery['executeAndWrap'] }
  abstract makeRoleStaffingCandidates(
    context: ProjectActionContext
  ): GetRoleStaffingCandidatesQuery
}
