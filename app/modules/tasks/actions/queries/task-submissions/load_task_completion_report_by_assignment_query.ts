import AppException from '#modules/errors/public_contracts/application_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { TaskCompletionReportFactBundle, TaskCompletionReportRepository } from '#modules/tasks/actions/ports/outbound/task_completion_report_repository'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

/** Owner-scoped native Completion Report hydration for the assignee editor. */
export default class LoadTaskCompletionReportByAssignmentQuery {
  constructor(
    private readonly execCtx: TaskActionContext,
    private readonly repository: TaskCompletionReportRepository
  ) {}

  async execute(assignmentId: string): Promise<TaskCompletionReportFactBundle | null> {
    const actorId = this.execCtx.userId
    if (!actorId) throw new UnauthorizedException()

    const bundle = await this.repository.findLatestFactBundleByAssignment(assignmentId)
    if (!bundle) return null
    if (bundle.report.reportedBy !== actorId) {
      throw new ForbiddenException('Only the reporting assignee can read this Completion Report')
    }

    return bundle
  }

  async executeAndWrap(
    assignmentId: string
  ): Promise<Result<TaskCompletionReportFactBundle | null, AppException>> {
    try {
      return Result.ok(await this.execute(assignmentId))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }
}
