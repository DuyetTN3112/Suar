import type CreateProjectSprintCommand from '#modules/sprints/actions/commands/create_project_sprint_command'
import type MoveTaskToSprintCommand from '#modules/sprints/actions/commands/move_task_to_sprint_command'
import type UpdateProjectSprintCommand from '#modules/sprints/actions/commands/update_project_sprint_command'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'

export abstract class SprintCommandFactory {
  abstract makeCreate(context: SprintActionContext): CreateProjectSprintCommand

  abstract makeMoveTask(context: SprintActionContext): MoveTaskToSprintCommand

  abstract makeUpdate(context: SprintActionContext): UpdateProjectSprintCommand
}
