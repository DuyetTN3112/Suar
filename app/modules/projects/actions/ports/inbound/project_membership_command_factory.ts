import type AddProjectMemberCommand from '#modules/projects/actions/commands/add_project_member_command'
import type RemoveProjectMemberCommand from '#modules/projects/actions/commands/remove_project_member_command'
import type UpdateProjectMemberCommand from '#modules/projects/actions/commands/update_project_member_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'

/**
 * Runtime inbound contract for context-bound project membership use cases.
 * The composition root owns the concrete dependency graph.
 */
export abstract class ProjectMembershipCommandFactory {
  abstract makeAddMember(context: ProjectActionContext): AddProjectMemberCommand
  abstract makeUpdateMember(context: ProjectActionContext): UpdateProjectMemberCommand
  abstract makeRemoveMember(context: ProjectActionContext): RemoveProjectMemberCommand
}
