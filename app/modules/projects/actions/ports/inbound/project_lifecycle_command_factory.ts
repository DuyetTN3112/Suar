import type CreateProjectCommand from '#modules/projects/actions/commands/project-context/create_project_command'
import type CreateProjectWithStaffingCommand from '#modules/projects/actions/commands/project-context/create_project_with_staffing_command'
import type DeleteProjectCommand from '#modules/projects/actions/commands/project-context/delete_project_command'
import type UpdateProjectCommand from '#modules/projects/actions/commands/project-context/update_project_command'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'

/**
 * Runtime inbound contract used by HTTP and cross-module drivers to obtain
 * request-context-bound project lifecycle use cases.
 *
 * Concrete dependency assembly belongs to the composition root.
 */
export abstract class ProjectLifecycleCommandFactory {
  abstract makeCreate(context: ProjectActionContext): CreateProjectCommand
  abstract makeCreateWithStaffing(context: ProjectActionContext): Pick<CreateProjectWithStaffingCommand, 'handle' | 'executeAndWrap'>
  abstract makeUpdate(context: ProjectActionContext): UpdateProjectCommand
  abstract makeDelete(context: ProjectActionContext): DeleteProjectCommand
}
