import type EndProjectSprintDeliveryCommand from '#modules/sprints/actions/commands/project-sprint/end_project_sprint_delivery_command'
import type { EndProjectSprintDeliveryResult } from '#modules/sprints/actions/commands/project-sprint/end_project_sprint_delivery_command'
import { BaseCommand } from '#modules/sprints/actions/base_command'
import type { SprintReviewClosure } from '#modules/sprints/actions/ports/outbound/sprint_review_closure'
import type { SprintActionContext } from '#modules/sprints/actions/sprint_action_context'
import type { EndProjectSprintDeliveryDTO } from '#modules/sprints/public_contracts/sprint_public_api'

export interface EndProjectSprintDeliveryAndOpenReviewResult
  extends EndProjectSprintDeliveryResult {
  review: unknown
}

/** Application workflow for the delivery boundary crossing into Reviews. */
export default class EndProjectSprintDeliveryAndOpenReviewCommand extends BaseCommand<
  EndProjectSprintDeliveryDTO,
  EndProjectSprintDeliveryAndOpenReviewResult
> {
  constructor(
    private readonly context: SprintActionContext,
    private readonly delivery: EndProjectSprintDeliveryCommand,
    private readonly reviewClosure: SprintReviewClosure
  ) {
    super()
  }

  override async execute(
    dto: EndProjectSprintDeliveryDTO
  ): Promise<EndProjectSprintDeliveryAndOpenReviewResult> {
    const deliveryResult = await this.delivery.executeAndWrap(dto)
    if (deliveryResult.isFailure()) throw deliveryResult.getError()

    const reviewResult = await this.reviewClosure.close(this.context, {
      sprint_id: dto.sprint_id,
      project_id: dto.project_id,
    })
    if (reviewResult.isFailure()) throw reviewResult.getError()

    return { ...deliveryResult.getValue(), review: reviewResult.getValue() }
  }
}
