import type { ApplicationService } from '@adonisjs/core/types'

import { SkillReviewIdentityReaderAdapter } from '../../adapters/skill_review_identity_reader_adapter.js'
import { TaskReviewAssignmentProjectionReaderAdapter } from '../../adapters/tasks/task_review_assignment_projection_reader_adapter.js'
import { TaskReviewCommentMentionReaderAdapter } from '../../adapters/tasks/task_review_comment_mention_reader_adapter.js'
import { TaskReviewCompletedAssignmentReaderAdapter } from '../../adapters/tasks/task_review_completed_assignment_reader_adapter.js'
import { UserReviewModeratorIdentityProjectionReaderAdapter } from '../../adapters/users/user_review_moderator_identity_projection_reader_adapter.js'
import {
  adminReviewActionFactory,
  adminReviewModerationGateway,
} from '../../admin/administration/admin_action_factory_composition.js'

import { ReviewModerationGateway as DashboardReviewModerationGateway } from '#modules/admin/dashboard/actions/ports/outbound/dashboard/review_moderation_gateway'
import { AdminReviewActionFactory } from '#modules/admin/reviews/actions/ports/inbound/reviews/admin_review_action_factory'
import { ReviewModerationGateway } from '#modules/admin/reviews/actions/ports/outbound/reviews/review_moderation_gateway'
import { ReviewCompletedAssignmentReader } from '#modules/reviews/actions/ports/outbound/review_completed_assignment_reader'
import {
  ReviewAssignmentProjectionReader,
  ReviewModeratorIdentityProjectionReader,
  ReviewSkillIdentityReader,
} from '#modules/reviews/actions/ports/outbound/review_projection_enrichment_readers'
import { ReviewTaskCommentMentionReader } from '#modules/reviews/actions/ports/outbound/review_task_comment_mention_reader'

export default class ReviewConsumerPortsProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    const moderationGateway = adminReviewModerationGateway
    this.app.container.singleton(
      ReviewCompletedAssignmentReader,
      () => new TaskReviewCompletedAssignmentReaderAdapter()
    )
    this.app.container.singleton(
      ReviewAssignmentProjectionReader,
      () => new TaskReviewAssignmentProjectionReaderAdapter()
    )
    this.app.container.singleton(
      ReviewModeratorIdentityProjectionReader,
      () => new UserReviewModeratorIdentityProjectionReaderAdapter()
    )
    this.app.container.singleton(
      ReviewSkillIdentityReader,
      () => new SkillReviewIdentityReaderAdapter()
    )
    this.app.container.singleton(
      ReviewTaskCommentMentionReader,
      () => new TaskReviewCommentMentionReaderAdapter()
    )
    this.app.container.singleton(
      ReviewModerationGateway,
      () => moderationGateway
    )
    this.app.container.singleton(
      DashboardReviewModerationGateway,
      () => moderationGateway
    )
    this.app.container.singleton(AdminReviewActionFactory, () => adminReviewActionFactory)
  }
}
