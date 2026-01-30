import type { ApplicationService } from '@adonisjs/core/types'

import { reviewActionFactory } from '#composition/review_action_factory'
import { aiDisputeAutoQueueCapability } from '#composition/review_ai_dispute_auto_queue_composition'
import { ReviewActionFactory } from '#modules/reviews/actions/ports/inbound/review_action_factory'
import { registerAiDisputeAutoQueueCapability } from '#modules/reviews/public_contracts/ai_dispute_auto_queue'

export default class ReviewActionFactoryProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    registerAiDisputeAutoQueueCapability(aiDisputeAutoQueueCapability)
    this.app.container.singleton(ReviewActionFactory, () => reviewActionFactory)
  }
}
