import type { ApplicationService } from '@adonisjs/core/types'

import { aiDisputeAutoQueueCapability } from '#composition/reviews/disputes/review_ai_dispute_auto_queue_composition'
import { reviewActionFactory } from '#composition/reviews/review-core/review_action_factory'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import { registerAiDisputeAutoQueueCapability } from '#modules/disputes/public_contracts/ai_dispute_auto_queue'

export default class ReviewActionFactoryProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    registerAiDisputeAutoQueueCapability(aiDisputeAutoQueueCapability)
    this.app.container.singleton(ReviewActionFactory, () => reviewActionFactory)
  }
}
