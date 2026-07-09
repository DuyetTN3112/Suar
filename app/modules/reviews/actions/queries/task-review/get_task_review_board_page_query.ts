import { BaseQuery } from '#modules/reviews/actions/base_query'
import type {
  ReviewProjectSummary,
  ReviewWorkflowNavigationReader,
} from '#modules/reviews/actions/ports/outbound/review_workflow_navigation_reader'
import type GetTaskReviewBoardQuery from '#modules/reviews/actions/queries/task-review/get_task_review_board_query'
import type { TaskReviewBoardResult } from '#modules/reviews/domain/task-review/task_review_workflow'

export interface GetTaskReviewBoardPageInput {
  projectId: string
  requestedTaskId: string | null
}

export interface TaskReviewBoardPageResult {
  board: TaskReviewBoardResult
  selectedTaskId: string | null
  detail: Record<string, unknown> | null
  project: ReviewProjectSummary
  workspaceTransition: {
    currentProjectId: string
  }
}

/**
 * Owns the complete read intent for the task-review board page.
 *
 * The HTTP adapter maps this projection to Inertia and persists the returned
 * workspace transition; it must not reconstruct the board/navigation workflow.
 */
export default class GetTaskReviewBoardPageQuery extends BaseQuery<
  GetTaskReviewBoardPageInput,
  TaskReviewBoardPageResult
> {
  constructor(
    private readonly boardQuery: GetTaskReviewBoardQuery,
    private readonly navigation: ReviewWorkflowNavigationReader
  ) {
    super()
  }

  async execute(input: GetTaskReviewBoardPageInput): Promise<TaskReviewBoardPageResult> {
    return this.handle(input)
  }

  async handle(input: GetTaskReviewBoardPageInput): Promise<TaskReviewBoardPageResult> {
    const board = await this.boardQuery.execute({
      projectId: input.projectId,
    })
    const project = await this.navigation.getProjectSummary(input.projectId)
    const visibleTaskIds = new Set(
      board.columns.flatMap((column) => column.cards.map((card) => card.taskId))
    )
    const selectedTaskId =
      input.requestedTaskId && visibleTaskIds.has(input.requestedTaskId)
        ? input.requestedTaskId
        : null
    const detail = selectedTaskId ? await this.navigation.getTaskReviewDetail(selectedTaskId) : null

    return {
      board,
      selectedTaskId,
      detail,
      project,
      workspaceTransition: {
        currentProjectId: input.projectId,
      },
    }
  }
}
