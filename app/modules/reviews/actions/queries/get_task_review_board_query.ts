import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { TaskReviewBoardResult } from '#modules/reviews/domain/task_review_workflow'
import { getTaskReviewBoardByProject } from '#modules/reviews/infra/repositories/read/task_review_board_queries'

interface GetTaskReviewBoardDTO {
  projectId: string
}

export default class GetTaskReviewBoardQuery extends BaseQuery<
  GetTaskReviewBoardDTO,
  TaskReviewBoardResult
> {
  async handle(dto: GetTaskReviewBoardDTO): Promise<TaskReviewBoardResult> {
    return getTaskReviewBoardByProject(dto.projectId, this.getCurrentUserId())
  }

  async execute(dto: GetTaskReviewBoardDTO): Promise<TaskReviewBoardResult> {
    return this.handle(dto)
  }
}
