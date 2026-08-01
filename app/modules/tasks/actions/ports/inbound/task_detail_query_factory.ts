import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type GetTaskAuditLogsQuery from '#modules/tasks/actions/queries/task-authoring/get_task_audit_logs_query'
import type GetTaskCreatePageQuery from '#modules/tasks/actions/queries/task-authoring/get_task_create_page_query'
import type GetTaskDetailQuery from '#modules/tasks/actions/queries/task-reading/get_task_detail_query'
import type GetTaskEditPageQuery from '#modules/tasks/actions/queries/task-reading/get_task_edit_page_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

export class TaskDetailQueryFactory {
  makeDetail(_context: TaskActionContext): GetTaskDetailQuery {
    throw new InvariantViolationException(
      'TaskDetailQueryFactory is an inbound token and must be composed'
    )
  }

  makeAuditLogs(_context: TaskActionContext): GetTaskAuditLogsQuery {
    throw new InvariantViolationException(
      'TaskDetailQueryFactory is an inbound token and must be composed'
    )
  }

  makeCreatePage(_context: TaskActionContext): GetTaskCreatePageQuery {
    throw new InvariantViolationException(
      'TaskDetailQueryFactory is an inbound token and must be composed'
    )
  }

  makeEditPage(_context: TaskActionContext): GetTaskEditPageQuery {
    throw new InvariantViolationException(
      'TaskDetailQueryFactory is an inbound token and must be composed'
    )
  }
}
