import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type AcknowledgeTaskAssignmentContractCommand from '#modules/tasks/actions/commands/task-assignment/acknowledge_task_assignment_contract_command'
import type RequestTaskAssignmentClarificationCommand from '#modules/tasks/actions/commands/task-assignment/request_task_assignment_clarification_command'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export class TaskAssignmentInteractionCommandFactory {
  makeAcknowledge(_context: TaskActionContext): AcknowledgeTaskAssignmentContractCommand {
    throw new InvariantViolationException(
      'TaskAssignmentInteractionCommandFactory is an inbound token and must be composed'
    )
  }

  makeClarification(_context: TaskActionContext): RequestTaskAssignmentClarificationCommand {
    throw new InvariantViolationException(
      'TaskAssignmentInteractionCommandFactory is an inbound token and must be composed'
    )
  }
}
