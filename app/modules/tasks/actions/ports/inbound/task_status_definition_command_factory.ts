import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type CreateTaskStatusCommand from '#modules/tasks/actions/commands/task-status/create_task_status_command'
import type DeleteTaskStatusCommand from '#modules/tasks/actions/commands/task-status/delete_task_status_command'
import type UpdateTaskStatusDefinitionCommand from '#modules/tasks/actions/commands/task-status/update_task_status_definition_command'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export class TaskStatusDefinitionCommandFactory {
  makeCreate(_context: TaskActionContext): CreateTaskStatusCommand {
    throw new InvariantViolationException(
      'TaskStatusDefinitionCommandFactory is an inbound token and must be composed'
    )
  }

  makeUpdate(_context: TaskActionContext): UpdateTaskStatusDefinitionCommand {
    throw new InvariantViolationException(
      'TaskStatusDefinitionCommandFactory is an inbound token and must be composed'
    )
  }

  makeDelete(_context: TaskActionContext): DeleteTaskStatusCommand {
    throw new InvariantViolationException(
      'TaskStatusDefinitionCommandFactory is an inbound token and must be composed'
    )
  }
}
