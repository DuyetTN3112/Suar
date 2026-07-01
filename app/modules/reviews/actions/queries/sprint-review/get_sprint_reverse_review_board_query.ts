import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { ReviewSprintReverseBoardReader } from '#modules/reviews/actions/ports/outbound/review_sprint_reverse_board_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  emptySprintReverseReviewBoardSection,
  type SprintReverseReviewBoard,
  type SprintReverseReviewCard,
} from '#modules/reviews/domain/sprint-review/sprint_reverse_review_workflow'

export default class GetSprintReverseReviewBoardQuery extends BaseQuery<
  { sprint_id: string },
  SprintReverseReviewBoard
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly boardReader: ReviewSprintReverseBoardReader
  ) {
    super(execCtx)
  }

  async handle(input: { sprint_id: string }): Promise<SprintReverseReviewBoard> {
    const actorId = this.execCtx.userId
    if (!actorId) {
      throw new UnauthorizedException()
    }

    const rows = await this.boardReader.listWorkflows(input.sprint_id, actorId)
    const relatedTasks = new Map(
      await Promise.all(
        rows
          .filter((row) => row.target_type === 'assigner' && row.target_user_id !== null)
          .map(async (row) => [
            row.id,
            await this.boardReader.listRelatedTasks({
              sprintId: row.sprint_id,
              projectId: row.project_id,
              reviewerId: row.reviewer_id,
              targetUserId: row.target_user_id as string,
            }),
          ] as const)
      )
    )
    const board: SprintReverseReviewBoard = {
      assigner: emptySprintReverseReviewBoardSection(),
      environment: emptySprintReverseReviewBoardSection(),
    }

    for (const row of rows) {
      if (row.status === 'ai_reviewing' || row.status === 'resolved') {
        continue
      }

      const card: SprintReverseReviewCard = {
        id: row.id,
        sprint_id: row.sprint_id,
        project_id: row.project_id,
        organization_id: row.organization_id,
        reviewer_id: row.reviewer_id,
        target_type: row.target_type,
        target_user_id: row.target_user_id,
        target_entity_id: row.target_entity_id,
        responder_id: row.responder_id,
        status: row.status,
        comment: row.comment,
        updated_at: row.updated_at,
        rating: row.rating,
        related_task_count: relatedTasks.get(row.id)?.length ?? 0,
        related_tasks: relatedTasks.get(row.id) ?? [],
        reviewer: {
          id: row.reviewer_id,
          username: row.reviewer_username,
          email: row.reviewer_email,
        },
        target_user: row.target_user_id
          ? {
              id: row.target_user_id,
              username: row.target_username,
              email: row.target_email,
            }
          : null,
        responder: row.responder_id
          ? {
              id: row.responder_id,
              username: row.responder_username,
              email: row.responder_email,
            }
          : null,
      }
      const section = row.target_type === 'assigner' ? board.assigner : board.environment
      section.columns[row.status].cards.push(card)
    }

    return board
  }
}
