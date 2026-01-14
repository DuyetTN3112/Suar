import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type CreateTaskCommand from '#modules/tasks/actions/commands/create_task_command'
import type DeleteTaskCommand from '#modules/tasks/actions/commands/delete_task_command'
import type UpdateTaskCommand from '#modules/tasks/actions/commands/update_task_command'
import type UpdateTaskTimeCommand from '#modules/tasks/actions/commands/update_task_time_command'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

/**
 * Inbound factory contract for request-context-bound lifecycle commands.
 *
 * Object construction belongs to outer composition. Commands remain the
 * primary business-operation orchestrators returned by this boundary.
 */
export class TaskLifecycleCommandFactory {
  makeCreate(_context: TaskActionContext): CreateTaskCommand {
    throw new InvariantViolationException(
      'TaskLifecycleCommandFactory is an inbound token and must be composed'
    )
  }

  makeUpdate(_context: TaskActionContext): UpdateTaskCommand {
    throw new InvariantViolationException(
      'TaskLifecycleCommandFactory is an inbound token and must be composed'
    )
  }

  makeDelete(_context: TaskActionContext): DeleteTaskCommand {
    throw new InvariantViolationException(
      'TaskLifecycleCommandFactory is an inbound token and must be composed'
    )
  }

  makeUpdateTime(_context: TaskActionContext): UpdateTaskTimeCommand {
    throw new InvariantViolationException(
      'TaskLifecycleCommandFactory is an inbound token and must be composed'
    )
  }
}
