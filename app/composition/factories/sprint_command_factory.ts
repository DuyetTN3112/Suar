import CreateProjectSprintCommand from '#modules/sprints/actions/commands/create_project_sprint_command'
import MoveTaskToSprintCommand from '#modules/sprints/actions/commands/move_task_to_sprint_command'
import UpdateProjectSprintCommand from '#modules/sprints/actions/commands/update_project_sprint_command'
import { SprintCommandFactory } from '#modules/sprints/actions/ports/inbound/sprint_command_factory'
import type { SprintExternalDependencies } from '#modules/sprints/actions/ports/outbound/sprint_external_dependencies'
import type {
  SprintRepository,
  SprintTransactionRunner,
} from '#modules/sprints/actions/ports/outbound/sprint_repository'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'

export class ComposedSprintCommandFactory extends SprintCommandFactory {
  constructor(
    private readonly dependencies: SprintExternalDependencies,
    private readonly repository: SprintRepository,
    private readonly transactions: SprintTransactionRunner
  ) {
    super()
  }

  makeCreate(context: SprintActionContext): CreateProjectSprintCommand {
    return new CreateProjectSprintCommand(context, this.dependencies, this.repository)
  }

  makeMoveTask(context: SprintActionContext): MoveTaskToSprintCommand {
    return new MoveTaskToSprintCommand(
      context,
      this.dependencies,
      this.repository,
      this.transactions
    )
  }

  makeUpdate(context: SprintActionContext): UpdateProjectSprintCommand {
    return new UpdateProjectSprintCommand(
      context,
      this.dependencies,
      this.repository,
      this.transactions
    )
  }
}
