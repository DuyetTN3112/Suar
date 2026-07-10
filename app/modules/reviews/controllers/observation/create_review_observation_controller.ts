import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import { buildCreateReviewObservationDTO, buildCreateReviewObservationNavigationRequest } from '#modules/reviews/controllers/mappers/request/observation/create_review_observation_request_mapper'
import { requireRouteParam } from '#modules/reviews/controllers/mappers/request/review-core/route_params'
import { safeTaskDetailRedirect } from '#modules/reviews/controllers/mappers/response/task-review/task_detail_redirect_mapper'

@inject()
export default class CreateReviewObservationController {
  constructor(private readonly actions: ReviewActionFactory) {}

  async handle(ctx: HttpContext) {
    const workflowId = requireRouteParam(ctx.params, 'workflowId')
    const dto = buildCreateReviewObservationDTO(ctx)
    if (dto.observation.reviewWorkflowId !== workflowId) {
      throw ValidationException.field(
        'observation.reviewWorkflowId',
        'Observation workflow does not match the route workflow'
      )
    }

    await this.actions
      .makeCreateReviewObservationCommand(actionContextFromHttp(ctx))
      .executeAndWrap(dto)
      .then((result) => result.getValue())

    const navigation = buildCreateReviewObservationNavigationRequest(ctx)
    const fallback =
      navigation.projectId && navigation.taskId
        ? `/projects/${encodeURIComponent(navigation.projectId)}/reviews/tasks?task_id=${encodeURIComponent(navigation.taskId)}`
        : '/tasks'

    ctx.session.flash('success', 'Review observation đã được ghi nhận')
    ctx.response
      .redirect()
      .toPath(safeTaskDetailRedirect(navigation.redirectTo, fallback))
  }
}
