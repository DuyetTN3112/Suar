import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { ReviewSprintBoardPageReader } from '#modules/reviews/actions/ports/outbound/review_sprint_board_page_reader'
import type { ReviewSprintReverseBoardReader } from '#modules/reviews/actions/ports/outbound/review_sprint_reverse_board_reader'
import GetSprintReverseReviewBoardQuery from '#modules/reviews/actions/queries/get_sprint_reverse_review_board_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  emptySprintReverseReviewBoardSection,
  type SprintReverseReviewBoard,
} from '#modules/reviews/domain/sprint_reverse_review_workflow'

export default class GetSprintReverseReviewPageQuery {
  constructor(
    private readonly context: ReviewActionContext,
    private readonly reader: ReviewSprintBoardPageReader,
    private readonly boardReader: ReviewSprintReverseBoardReader
  ) {}

  async execute(input: { projectId: string; sprintId: string | null }): Promise<{
    sprintId: string | null
    reviewWindow: Awaited<ReturnType<ReviewSprintBoardPageReader['loadSprintReviewWindow']>>
    board: SprintReverseReviewBoard
    project: { id: string; name: string }
  }> {
    const actorId = this.context.userId
    if (!actorId) throw new UnauthorizedException()

    const access = await this.reader.loadProjectAccessFacts(input.projectId, actorId)
    const project = access.project

    if (
      !project ||
      (this.context.organizationId && project.organizationId !== this.context.organizationId)
    ) {
      throw new NotFoundException('Project not found')
    }

    const ownsProject =
      project.ownerId === actorId ||
      project.managerId === actorId ||
      project.creatorId === actorId
    if (!ownsProject && !access.isProjectMember && !access.isOrganizationAdministrator) {
      throw new ForbiddenException('You do not have access to this project review board')
    }

    const reviewWindow = await this.reader.loadSprintReviewWindow({
      actorId,
      organizationId: this.context.organizationId,
      projectId: input.projectId,
      sprintId: input.sprintId,
    })
    const sprintId = input.sprintId ?? reviewWindow?.sprintId ?? null
    let board: SprintReverseReviewBoard = {
      assigner: emptySprintReverseReviewBoardSection(),
      environment: emptySprintReverseReviewBoardSection(),
    }

    if (sprintId) {
      board = await new GetSprintReverseReviewBoardQuery(this.context, this.boardReader).handle({
        sprint_id: sprintId,
      })
    }

    return {
      sprintId,
      reviewWindow,
      board,
      project: { id: project.id, name: project.name },
    }
  }
}
