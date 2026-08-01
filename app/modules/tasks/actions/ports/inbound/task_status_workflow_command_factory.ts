import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type BatchUpdateTaskStatusCommand from '#modules/tasks/actions/commands/task-status/batch_update_task_status_command'
import type ReplaceTaskWorkflowTransitionsCommand from '#modules/tasks/actions/commands/task-workflow/replace_task_workflow_transitions_command'
import type UpdateTaskSortOrderCommand from '#modules/tasks/actions/commands/task-authoring/update_task_sort_order_command'
import type UpdateTaskStatusCommand from '#modules/tasks/actions/commands/task-status/update_task_status_command'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export class TaskStatusWorkflowCommandFactory {
  makeBatchUpdate(_context: TaskActionContext): BatchUpdateTaskStatusCommand {
    throw new InvariantViolationException(
      'TaskStatusWorkflowCommandFactory is an inbound token and must be composed'
    )
  }

  makeUpdateSortOrder(_context: TaskActionContext): UpdateTaskSortOrderCommand {
    throw new InvariantViolationException(
      'TaskStatusWorkflowCommandFactory is an inbound token and must be composed'
    )
  }

  makeUpdateStatus(_context: TaskActionContext): UpdateTaskStatusCommand {
    throw new InvariantViolationException(
      'TaskStatusWorkflowCommandFactory is an inbound token and must be composed'
    )
  }

  makeReplaceWorkflow(_context: TaskActionContext): ReplaceTaskWorkflowTransitionsCommand {
    throw new InvariantViolationException(
      'TaskStatusWorkflowCommandFactory is an inbound token and must be composed'
    )
  }
}
