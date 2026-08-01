import emitter from '@adonisjs/core/services/emitter'

import { reviewActionFactory } from '#composition/review_action_factory'
import loggerService from '#modules/logger/public_contracts/application_logger'
import InvalidateUserReviewCacheCommand from '#modules/reviews/actions/commands/invalidate_user_review_cache_command'
import ProcessTaskAssignmentCompletedEventCommand from '#modules/reviews/actions/commands/process_task_assignment_completed_event_command'
import { reviewCachePortImpl } from '#modules/reviews/infra/adapters/review_cache_adapter'
import { reviewSessionCommandRepository } from '#modules/reviews/infra/repositories/write/review_session_command_repository'
import {
  handleTaskAssignmentCompleted,
  type AssignmentCompletionListenerDependencies,
} from '#modules/reviews/listeners/assignment_completion_listener'
import {
  handleDisputeResolved,
  handleReviewConfirmed,
  handleReviewSkillScoreUpdated,
  handleReviewSubmitted,
  type ReviewListenerDependencies,
} from '#modules/reviews/listeners/review_listener'

const invalidateUserReviewCache = new InvalidateUserReviewCacheCommand(reviewCachePortImpl)

const dependencies: ReviewListenerDependencies = {
  processReviewSubmitted: (event, context) =>
    reviewActionFactory.makeProcessReviewSubmittedEventCommand().handle(event, context),
  processReviewConfirmed: (event, context) =>
    reviewActionFactory.makeProcessReviewConfirmedEventCommand().handle(event, context),
  processDisputeResolved: (event, context) =>
    reviewActionFactory.makeProcessDisputeResolvedEventCommand().handle(event, context),
  processSkillScoreUpdated: (event) => invalidateUserReviewCache.execute({ userId: event.userId }),
  logger: loggerService,
}

const processTaskAssignmentCompletedEvent = new ProcessTaskAssignmentCompletedEventCommand(
  reviewSessionCommandRepository
)

const assignmentCompletionDependencies: AssignmentCompletionListenerDependencies = {
  processTaskAssignmentCompleted: (event) => processTaskAssignmentCompletedEvent.handle(event),
  logger: loggerService,
}

emitter.on('review:submitted', (event) => handleReviewSubmitted(event, dependencies))
emitter.on('review:confirmed', (event) => handleReviewConfirmed(event, dependencies))
emitter.on('dispute:resolved', (event) => handleDisputeResolved(event, dependencies))
emitter.on('skill:score:updated', (event) => handleReviewSkillScoreUpdated(event, dependencies))
emitter.on('task:assignment:completed', (event) =>
  handleTaskAssignmentCompleted(event, assignmentCompletionDependencies)
)
