import AcceptSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/sprint-review/accept_sprint_reverse_review_workflow_command'
import CloseProjectSprintReviewCommand from '#modules/reviews/actions/commands/sprint-review/close_project_sprint_review_command'
import CloseProjectSprintReviewPeriodCommand from '#modules/reviews/actions/commands/sprint-review/close_project_sprint_review_period_command'
import CreateSprintReviewDisputeCommand from '#modules/reviews/actions/commands/disputes/create_sprint_review_dispute_command'
import CreateSprintReviewDisputeCommentCommand from '#modules/reviews/actions/commands/disputes/create_sprint_review_dispute_comment_command'
import ExpireSprintReviewPackagesCommand from '#modules/reviews/actions/commands/sprint-review/expire_sprint_review_packages_command'
import ReportSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/sprint-review/report_sprint_reverse_review_workflow_command'
import ReportSprintReviewDisputeCommand from '#modules/reviews/actions/commands/disputes/report_sprint_review_dispute_command'
import RespondSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/disputes/respond_sprint_reverse_review_workflow_command'
import SubmitSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/sprint-review/submit_sprint_reverse_review_workflow_command'
import SubmitSprintReviewPackageCommand from '#modules/reviews/actions/commands/sprint-review/submit_sprint_review_package_command'
import type { ReviewCryptography } from '#modules/reviews/actions/ports/outbound/review_cryptography'
import type { ReviewSprintBoardPageReader } from '#modules/reviews/actions/ports/outbound/review_sprint_board_page_reader'
import type { ReviewSprintLifecycleUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_sprint_lifecycle_unit_of_work'
import type { ReviewSprintPackageMutationUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_sprint_package_mutation_unit_of_work'
import type { ReviewSprintPackageReader } from '#modules/reviews/actions/ports/outbound/review_sprint_package_reader'
import type { ReviewSprintReverseBoardReader } from '#modules/reviews/actions/ports/outbound/review_sprint_reverse_board_reader'
import type { ReviewSprintReverseWorkflowUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_sprint_reverse_workflow_unit_of_work'
import type { ReviewWorkflowNavigationReader } from '#modules/reviews/actions/ports/outbound/review_workflow_navigation_reader'
import type { SprintReviewDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/sprint_review_dispute_unit_of_work'
import GetReviewWorkflowNavigationQuery from '#modules/reviews/actions/queries/review-session/get_review_workflow_navigation_query'
import GetSprintReverseReviewPageQuery from '#modules/reviews/actions/queries/sprint-review/get_sprint_reverse_review_page_query'
import GetSprintReviewDisputeDetailQuery from '#modules/reviews/actions/queries/disputes/get_sprint_review_dispute_detail_query'
import GetSprintReviewPackageDetailQuery from '#modules/reviews/actions/queries/sprint-review/get_sprint_review_package_detail_query'
import ListPendingSprintReviewPackagesQuery from '#modules/reviews/actions/queries/sprint-review/list_pending_sprint_review_packages_query'
import ListSprintReviewPackagesQuery from '#modules/reviews/actions/queries/sprint-review/list_sprint_review_packages_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ReviewSprintActionFactoryDependencies {
  workflowNavigation?: ReviewWorkflowNavigationReader
  sprintBoardPageReader?: ReviewSprintBoardPageReader
  cryptography?: ReviewCryptography
  sprintPackages?: ReviewSprintPackageReader
  sprintDisputes?: SprintReviewDisputeUnitOfWork
  sprintLifecycle?: ReviewSprintLifecycleUnitOfWork
  sprintPackageMutations?: ReviewSprintPackageMutationUnitOfWork
  sprintReverseBoard?: ReviewSprintReverseBoardReader
  sprintReverseWorkflows?: ReviewSprintReverseWorkflowUnitOfWork
}

/**
 * Constructs sprint-package, sprint-dispute, and reverse-review use cases.
 */
export class ReviewSprintActionFactory {
  constructor(private readonly dependencies: ReviewSprintActionFactoryDependencies) {}

  makeWorkflowNavigationQuery(): GetReviewWorkflowNavigationQuery {
    return new GetReviewWorkflowNavigationQuery(this.requireWorkflowNavigation())
  }

  makeGetSprintReverseReviewPageQuery(
    execCtx: ReviewActionContext
  ): GetSprintReverseReviewPageQuery {
    return new GetSprintReverseReviewPageQuery(
      execCtx,
      this.requireSprintBoardPageReader(),
      this.requireSprintReverseBoard()
    )
  }

  makeGetSprintReviewPackageDetailQuery(
    execCtx: ReviewActionContext
  ): GetSprintReviewPackageDetailQuery {
    return new GetSprintReviewPackageDetailQuery(execCtx, this.requireSprintPackages())
  }

  makeAcceptSprintReverseReviewWorkflowCommand(
    execCtx: ReviewActionContext
  ): AcceptSprintReverseReviewWorkflowCommand {
    return new AcceptSprintReverseReviewWorkflowCommand(
      execCtx,
      this.requireCryptography(),
      this.requireSprintReverseWorkflows()
    )
  }

  makeReportSprintReverseReviewWorkflowCommand(
    execCtx: ReviewActionContext
  ): ReportSprintReverseReviewWorkflowCommand {
    return new ReportSprintReverseReviewWorkflowCommand(
      execCtx,
      this.requireCryptography(),
      this.requireSprintReverseWorkflows()
    )
  }

  makeRespondSprintReverseReviewWorkflowCommand(
    execCtx: ReviewActionContext
  ): RespondSprintReverseReviewWorkflowCommand {
    return new RespondSprintReverseReviewWorkflowCommand(
      execCtx,
      this.requireCryptography(),
      this.requireSprintReverseWorkflows()
    )
  }

  makeSubmitSprintReverseReviewWorkflowCommand(
    execCtx: ReviewActionContext
  ): SubmitSprintReverseReviewWorkflowCommand {
    return new SubmitSprintReverseReviewWorkflowCommand(
      execCtx,
      this.requireCryptography(),
      this.requireSprintReverseWorkflows()
    )
  }

  makeCreateSprintReviewDisputeCommand(
    execCtx: ReviewActionContext
  ): CreateSprintReviewDisputeCommand {
    return new CreateSprintReviewDisputeCommand(
      execCtx,
      this.requireCryptography(),
      this.requireSprintDisputes()
    )
  }

  makeCreateSprintReviewDisputeCommentCommand(
    execCtx: ReviewActionContext
  ): CreateSprintReviewDisputeCommentCommand {
    return new CreateSprintReviewDisputeCommentCommand(
      execCtx,
      this.requireCryptography(),
      this.requireSprintDisputes()
    )
  }

  makeReportSprintReviewDisputeCommand(
    execCtx: ReviewActionContext
  ): ReportSprintReviewDisputeCommand {
    return new ReportSprintReviewDisputeCommand(execCtx, this.requireSprintDisputes())
  }

  makeGetSprintReviewDisputeDetailQuery(
    execCtx: ReviewActionContext
  ): GetSprintReviewDisputeDetailQuery {
    return new GetSprintReviewDisputeDetailQuery(execCtx, this.requireSprintDisputes())
  }

  makeCloseProjectSprintReviewCommand(
    execCtx: ReviewActionContext
  ): CloseProjectSprintReviewCommand {
    return new CloseProjectSprintReviewCommand(
      execCtx,
      this.requireCryptography(),
      this.requireSprintPackageMutations()
    )
  }

  makeSubmitSprintReviewPackageCommand(
    execCtx: ReviewActionContext
  ): SubmitSprintReviewPackageCommand {
    return new SubmitSprintReviewPackageCommand(
      execCtx,
      this.requireCryptography(),
      this.requireSprintPackageMutations()
    )
  }

  makeListPendingSprintReviewPackagesQuery(
    execCtx: ReviewActionContext
  ): ListPendingSprintReviewPackagesQuery {
    return new ListPendingSprintReviewPackagesQuery(execCtx, this.requireSprintPackages())
  }

  makeListSprintReviewPackagesQuery(execCtx: ReviewActionContext): ListSprintReviewPackagesQuery {
    return new ListSprintReviewPackagesQuery(execCtx, this.requireSprintPackages())
  }

  makeCloseProjectSprintReviewPeriodCommand(
    execCtx: ReviewActionContext
  ): CloseProjectSprintReviewPeriodCommand {
    return new CloseProjectSprintReviewPeriodCommand(execCtx, this.requireSprintLifecycle())
  }

  makeExpireSprintReviewPackagesCommand(
    execCtx: ReviewActionContext
  ): ExpireSprintReviewPackagesCommand {
    return new ExpireSprintReviewPackagesCommand(execCtx, this.requireSprintLifecycle())
  }

  private requireWorkflowNavigation(): ReviewWorkflowNavigationReader {
    if (!this.dependencies.workflowNavigation) {
      throw new Error('Review workflow navigation capability is not configured')
    }
    return this.dependencies.workflowNavigation
  }

  private requireSprintBoardPageReader(): ReviewSprintBoardPageReader {
    if (!this.dependencies.sprintBoardPageReader) {
      throw new Error('Sprint reverse review page capability is not configured')
    }
    return this.dependencies.sprintBoardPageReader
  }

  private requireCryptography(): ReviewCryptography {
    if (!this.dependencies.cryptography) {
      throw new Error('Review cryptography capability is not configured')
    }
    return this.dependencies.cryptography
  }

  private requireSprintPackages(): ReviewSprintPackageReader {
    if (!this.dependencies.sprintPackages) {
      throw new Error('Review sprint package read capability is not configured')
    }
    return this.dependencies.sprintPackages
  }

  private requireSprintDisputes(): SprintReviewDisputeUnitOfWork {
    if (!this.dependencies.sprintDisputes) {
      throw new Error('Sprint review dispute capability is not configured')
    }
    return this.dependencies.sprintDisputes
  }

  private requireSprintLifecycle(): ReviewSprintLifecycleUnitOfWork {
    if (!this.dependencies.sprintLifecycle) {
      throw new Error('Review sprint lifecycle capability is not configured')
    }
    return this.dependencies.sprintLifecycle
  }

  private requireSprintPackageMutations(): ReviewSprintPackageMutationUnitOfWork {
    if (!this.dependencies.sprintPackageMutations) {
      throw new Error('Review sprint package mutation capability is not configured')
    }
    return this.dependencies.sprintPackageMutations
  }

  private requireSprintReverseBoard(): ReviewSprintReverseBoardReader {
    if (!this.dependencies.sprintReverseBoard) {
      throw new Error('Sprint reverse review board capability is not configured')
    }
    return this.dependencies.sprintReverseBoard
  }

  private requireSprintReverseWorkflows(): ReviewSprintReverseWorkflowUnitOfWork {
    if (!this.dependencies.sprintReverseWorkflows) {
      throw new Error('Sprint reverse review workflow capability is not configured')
    }
    return this.dependencies.sprintReverseWorkflows
  }
}
