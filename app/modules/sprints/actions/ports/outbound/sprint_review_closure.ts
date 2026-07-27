import type AppException from '#modules/errors/public_contracts/application_exception'
import type { Result } from '#modules/errors/public_contracts/result'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'

export interface SprintReviewClosureInput {
  readonly sprint_id: string
  readonly project_id: string
}

/** Sprint-owned capability for opening the next review phase. */
export abstract class SprintReviewClosure {
  abstract close(
    context: SprintActionContext,
    input: SprintReviewClosureInput
  ): Promise<Result<unknown, AppException>>
}
