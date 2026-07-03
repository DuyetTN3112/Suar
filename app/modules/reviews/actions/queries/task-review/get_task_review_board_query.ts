import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { ReviewTaskBoardReader } from '#modules/reviews/actions/ports/outbound/review_task_board_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { TaskReviewBoardResult } from '#modules/reviews/domain/task-review/task_review_workflow'

interface GetTaskReviewBoardDTO {
  projectId: string
}

export default class GetTaskReviewBoardQuery extends BaseQuery<
  GetTaskReviewBoardDTO,
  TaskReviewBoardResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly boards: ReviewTaskBoardReader
  ) {
    super(execCtx)
  }

  async handle(dto: GetTaskReviewBoardDTO): Promise<TaskReviewBoardResult> {
    const actorId = this.getCurrentUserId()
    if (!actorId) {
      throw new ForbiddenException('You do not have permission to view this task review board')
    }
    await this.assertCanReadBoard(dto.projectId, actorId)
    return this.boards.loadBoard(dto.projectId, actorId)
  }

  async execute(dto: GetTaskReviewBoardDTO): Promise<TaskReviewBoardResult> {
    return this.handle(dto)
  }

  private async assertCanReadBoard(projectId: string, actorId: string): Promise<void> {
    const access = await this.boards.findAccess(projectId, actorId)
    if (!access.projectExists) {
      throw new NotFoundException('Project not found')
    }
    if (access.canRead) {
      return
    }

    throw new ForbiddenException('You do not have permission to view this task review board')
  }
}
