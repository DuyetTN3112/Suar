import type { TaskReviewBoardResult } from '#modules/reviews/domain/task-review/task_review_workflow'

export interface ReviewTaskBoardAccess {
  projectExists: boolean
  canRead: boolean
}

export interface ReviewTaskBoardReader {
  findAccess(projectId: string, actorId: string): Promise<ReviewTaskBoardAccess>
  loadBoard(projectId: string, actorId: string): Promise<TaskReviewBoardResult>
}
