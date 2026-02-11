import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { ReviewDisputeArtifactReader } from '#modules/reviews/actions/ports/outbound/review_dispute_artifact_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ListReviewDisputeEvidencesDTO {
  dispute_id: string
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

export default class ListReviewDisputeEvidencesQuery {
  constructor(
    private readonly execCtx: ReviewActionContext,
    private readonly artifacts: ReviewDisputeArtifactReader
  ) {}

  async execute(dto: ListReviewDisputeEvidencesDTO): Promise<Record<string, unknown>[]> {
    const actorId = requireUserId(this.execCtx)
    const snapshot = await this.artifacts.listEvidences(dto.dispute_id, actorId)
    if (!snapshot.access.isParticipant) {
      throw new ForbiddenException('Only dispute participants can view evidences')
    }
    return snapshot.items
  }
}
