import CreateProjectSprintCommand from '#modules/sprints/actions/commands/create_project_sprint_command'
import MoveTaskToSprintCommand from '#modules/sprints/actions/commands/move_task_to_sprint_command'
import UpdateProjectSprintCommand from '#modules/sprints/actions/commands/update_project_sprint_command'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import { sprintExternalDeps } from '#modules/sprints/bootstrap/sprint_composition_root'

export function makeCreateProjectSprintCommand(
  execCtx: SprintActionContext
): CreateProjectSprintCommand {
  return new CreateProjectSprintCommand(execCtx, sprintExternalDeps)
}

export function makeMoveTaskToSprintCommand(
  execCtx: SprintActionContext
): MoveTaskToSprintCommand {
  return new MoveTaskToSprintCommand(execCtx, sprintExternalDeps)
}

export function makeUpdateProjectSprintCommand(
  execCtx: SprintActionContext
): UpdateProjectSprintCommand {
  return new UpdateProjectSprintCommand(execCtx, sprintExternalDeps)
}
