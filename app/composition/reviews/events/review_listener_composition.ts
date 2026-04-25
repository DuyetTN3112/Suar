import emitter from '@adonisjs/core/services/emitter'

import { reviewActionFactory } from '#composition/reviews/review-core/review_action_factory'
import UserWorkHistoryCacheInvalidatorAdapter from '#composition/adapters/users/user_work_history_cache_invalidator_adapter'
import { reviewExternalDependencies } from '#composition/reviews/review-core/review_external_dependencies_composition'
import loggerService from '#modules/logger/public_contracts/application_logger'
import InvalidateUserReviewCacheCommand from '#modules/reviews/actions/commands/review-session/invalidate_user_review_cache_command'
import ProcessTaskAssignmentCompletedEventCommand from '#modules/reviews/actions/commands/task-review/process_task_assignment_completed_event_command'
import ProcessTaskReviewFinalizedEventCommand from '#modules/reviews/actions/commands/task-review/process_task_review_finalized_event_command'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { LucidReviewTransactionRunner } from '#modules/reviews/infra/adapters/review-core/lucid_review_transaction_runner'
import { reviewCachePortImpl } from '#modules/reviews/infra/adapters/review-core/review_cache_adapter'
import LucidTaskReviewFinalizationSourceReader from '#modules/reviews/infra/adapters/task-review/lucid_task_review_finalization_source_reader'
import { reviewSessionCommandRepository } from '#modules/reviews/infra/repositories/write/review_session_command_repository'
import {
  handleTaskAssignmentCompleted,
  type AssignmentCompletionListenerDependencies,
} from '#modules/reviews/listeners/assignment_completion_listener'
import {
  handleDisputeResolved,
  handleTaskReviewFinalized,
  handleReviewConfirmed,
  handleReviewSkillScoreUpdated,
  handleReviewSubmitted,
  type ReviewListenerDependencies,
} from '#modules/reviews/listeners/review_listener'

const invalidateUserReviewCache = new InvalidateUserReviewCacheCommand(
  makeSystemReviewActionContext('system'),
  reviewCachePortImpl
)

const processTaskReviewFinalizedEvent = new ProcessTaskReviewFinalizedEventCommand(
  reviewExternalDependencies,
  new LucidReviewTransactionRunner(),
  new LucidTaskReviewFinalizationSourceReader(),
  new UserWorkHistoryCacheInvalidatorAdapter()
)

const dependencies: ReviewListenerDependencies = {
  processReviewSubmitted: (event, context) =>
    reviewActionFactory.makeProcessReviewSubmittedEventCommand().handle(event, context),
  processReviewConfirmed: (event, context) =>
    reviewActionFactory.makeProcessReviewConfirmedEventCommand().handle(event, context),
  processDisputeResolved: (event, context) =>
    reviewActionFactory.makeProcessDisputeResolvedEventCommand().handle(event, context),
  processTaskReviewFinalized: (event, context) =>
    processTaskReviewFinalizedEvent.handle(event, context),
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
emitter.on('task-review:finalized', (event) => handleTaskReviewFinalized(event, dependencies))
emitter.on('skill:score:updated', (event) => handleReviewSkillScoreUpdated(event, dependencies))
emitter.on('task:assignment:completed', (event) =>
  handleTaskAssignmentCompleted(event, assignmentCompletionDependencies)
)
