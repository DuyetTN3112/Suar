import BuildReviewDisputeCaseFileCommand from '#modules/reviews/actions/commands/build_review_dispute_case_file_command'
import ConfirmReviewCommand from '#modules/reviews/actions/commands/confirm_review_command'
import CreateReviewDisputeCommand from '#modules/reviews/actions/commands/create_review_dispute_command'
import CreateReviewDisputeCommentCommand from '#modules/reviews/actions/commands/create_review_dispute_comment_command'
import CreateReviewDisputeEvidenceCommand from '#modules/reviews/actions/commands/create_review_dispute_evidence_command'
import ReportReviewDisputeCommand from '#modules/reviews/actions/commands/report_review_dispute_command'
import ResolveFlaggedReviewCommand from '#modules/reviews/actions/commands/resolve_flagged_review_command'
import ResolveReviewDisputeCommand from '#modules/reviews/actions/commands/resolve_review_dispute_command'
import RespondToReviewDisputeCommand from '#modules/reviews/actions/commands/respond_to_review_dispute_command'
import type { AiDisputeEvaluationSourceReader } from '#modules/reviews/actions/ports/outbound/ai_dispute_evaluation_source_reader'
import type { ReviewAdminDisputeReadModel } from '#modules/reviews/actions/ports/outbound/review_admin_dispute_read_model'
import type { ReviewConfirmationDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_confirmation_dispute_unit_of_work'
import type { ReviewDisputeArtifactReader } from '#modules/reviews/actions/ports/outbound/review_dispute_artifact_reader'
import type { ReviewDisputeCaseFileUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_dispute_case_file_unit_of_work'
import type { ReviewDisputeResolutionUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_dispute_resolution_unit_of_work'
import type { ReviewDisputeUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_dispute_unit_of_work'
import type { ReviewExternalDependencies } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewExternalEffectPublisher } from '#modules/reviews/actions/ports/outbound/review_external_effects'
import type { ReviewFlaggedModerationUnitOfWork } from '#modules/reviews/actions/ports/outbound/review_flagged_moderation_unit_of_work'
import type { ReviewMetricsReader } from '#modules/reviews/actions/ports/outbound/review_metrics_reader'
import type { ReviewOrgDisputeReader } from '#modules/reviews/actions/ports/outbound/review_org_dispute_reader'
import GetAdminReviewDisputeDetailQuery from '#modules/reviews/actions/queries/get_admin_review_dispute_detail_query'
import ListAdminReviewDisputesQuery from '#modules/reviews/actions/queries/list_admin_review_disputes_query'
import ListOrgReviewDisputesQuery from '#modules/reviews/actions/queries/list_org_review_disputes_query'
import ListReviewDisputeCaseFilesQuery from '#modules/reviews/actions/queries/list_review_dispute_case_files_query'
import ListReviewDisputeCommentsQuery from '#modules/reviews/actions/queries/list_review_dispute_comments_query'
import ListReviewDisputeEvidencesQuery from '#modules/reviews/actions/queries/list_review_dispute_evidences_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ReviewDisputeActionFactoryDependencies {
  externalDependencies: ReviewExternalDependencies
  metricsReader?: ReviewMetricsReader
  aiDisputeSources?: AiDisputeEvaluationSourceReader
  externalEffects?: ReviewExternalEffectPublisher
  disputeArtifacts?: ReviewDisputeArtifactReader
  disputeUnitOfWork?: ReviewDisputeUnitOfWork
  disputeCaseFiles?: ReviewDisputeCaseFileUnitOfWork
  orgDisputes?: ReviewOrgDisputeReader
  confirmationDisputes?: ReviewConfirmationDisputeUnitOfWork
  flaggedModeration?: ReviewFlaggedModerationUnitOfWork
  adminDisputes?: ReviewAdminDisputeReadModel
  disputeResolutions?: ReviewDisputeResolutionUnitOfWork
}

/**
 * Constructs member, organization, and moderator dispute use cases.
 */
export class ReviewDisputeActionFactory {
  constructor(private readonly dependencies: ReviewDisputeActionFactoryDependencies) {}

  makeCreateReviewDisputeCommentCommand(
    execCtx: ReviewActionContext
  ): CreateReviewDisputeCommentCommand {
    return new CreateReviewDisputeCommentCommand(execCtx, this.requireDisputeUnitOfWork())
  }

  makeCreateReviewDisputeEvidenceCommand(
    execCtx: ReviewActionContext
  ): CreateReviewDisputeEvidenceCommand {
    return new CreateReviewDisputeEvidenceCommand(execCtx, this.requireDisputeUnitOfWork())
  }

  makeRespondToReviewDisputeCommand(execCtx: ReviewActionContext): RespondToReviewDisputeCommand {
    return new RespondToReviewDisputeCommand(execCtx, this.requireDisputeUnitOfWork())
  }

  makeBuildReviewDisputeCaseFileCommand(
    execCtx: ReviewActionContext
  ): BuildReviewDisputeCaseFileCommand {
    return new BuildReviewDisputeCaseFileCommand(execCtx, this.requireDisputeCaseFiles())
  }

  makeReportReviewDisputeCommand(execCtx: ReviewActionContext): ReportReviewDisputeCommand {
    return new ReportReviewDisputeCommand(execCtx, this.requireDisputeCaseFiles())
  }

  makeGetAdminReviewDisputeDetailQuery(
    execCtx: ReviewActionContext
  ): GetAdminReviewDisputeDetailQuery {
    return new GetAdminReviewDisputeDetailQuery(
      execCtx,
      this.requireDisputeArtifacts(),
      this.requireAiDisputeSources(),
      this.requireAdminDisputes()
    )
  }

  makeResolveFlaggedReviewCommand(execCtx: ReviewActionContext): ResolveFlaggedReviewCommand {
    return new ResolveFlaggedReviewCommand(
      execCtx,
      this.dependencies.externalDependencies.userSkill,
      this.requireMetricsReader(),
      this.requireExternalEffects(),
      this.requireFlaggedModeration()
    )
  }

  makeListOrgReviewDisputesQuery(execCtx: ReviewActionContext): ListOrgReviewDisputesQuery {
    return new ListOrgReviewDisputesQuery(
      execCtx,
      this.dependencies.externalDependencies.organization,
      this.requireOrgDisputes()
    )
  }

  makeListReviewDisputeCommentsQuery(execCtx: ReviewActionContext): ListReviewDisputeCommentsQuery {
    return new ListReviewDisputeCommentsQuery(execCtx, this.requireDisputeArtifacts())
  }

  makeListReviewDisputeEvidencesQuery(
    execCtx: ReviewActionContext
  ): ListReviewDisputeEvidencesQuery {
    return new ListReviewDisputeEvidencesQuery(execCtx, this.requireDisputeArtifacts())
  }

  makeResolveReviewDisputeCommand(execCtx: ReviewActionContext): ResolveReviewDisputeCommand {
    return new ResolveReviewDisputeCommand(execCtx, this.requireDisputeResolutions())
  }

  makeConfirmReviewCommand(execCtx: ReviewActionContext): ConfirmReviewCommand {
    return new ConfirmReviewCommand(execCtx, this.requireConfirmationDisputes())
  }

  makeListReviewDisputeCaseFilesQuery(
    execCtx: ReviewActionContext
  ): ListReviewDisputeCaseFilesQuery {
    return new ListReviewDisputeCaseFilesQuery(
      execCtx,
      this.requireDisputeArtifacts(),
      this.requireAiDisputeSources()
    )
  }

  makeCreateReviewDisputeCommand(execCtx: ReviewActionContext): CreateReviewDisputeCommand {
    return new CreateReviewDisputeCommand(execCtx, this.requireConfirmationDisputes())
  }

  makeListAdminReviewDisputesQuery(execCtx: ReviewActionContext): ListAdminReviewDisputesQuery {
    return new ListAdminReviewDisputesQuery(execCtx, this.requireAdminDisputes())
  }

  private requireMetricsReader(): ReviewMetricsReader {
    if (!this.dependencies.metricsReader) {
      throw new Error('Review metrics capability is not configured')
    }
    return this.dependencies.metricsReader
  }

  private requireAiDisputeSources(): AiDisputeEvaluationSourceReader {
    if (!this.dependencies.aiDisputeSources) {
      throw new Error('AI dispute evaluation source capability is not configured')
    }
    return this.dependencies.aiDisputeSources
  }

  private requireExternalEffects(): ReviewExternalEffectPublisher {
    if (!this.dependencies.externalEffects) {
      throw new Error('Review external effects capability is not configured')
    }
    return this.dependencies.externalEffects
  }

  private requireDisputeArtifacts(): ReviewDisputeArtifactReader {
    if (!this.dependencies.disputeArtifacts) {
      throw new Error('Review dispute artifact capability is not configured')
    }
    return this.dependencies.disputeArtifacts
  }

  private requireDisputeUnitOfWork(): ReviewDisputeUnitOfWork {
    if (!this.dependencies.disputeUnitOfWork) {
      throw new Error('Review dispute mutation capability is not configured')
    }
    return this.dependencies.disputeUnitOfWork
  }

  private requireDisputeCaseFiles(): ReviewDisputeCaseFileUnitOfWork {
    if (!this.dependencies.disputeCaseFiles) {
      throw new Error('Review dispute case-file capability is not configured')
    }
    return this.dependencies.disputeCaseFiles
  }

  private requireDisputeResolutions(): ReviewDisputeResolutionUnitOfWork {
    if (!this.dependencies.disputeResolutions) {
      throw new Error('Review dispute resolution capability is not configured')
    }
    return this.dependencies.disputeResolutions
  }

  private requireConfirmationDisputes(): ReviewConfirmationDisputeUnitOfWork {
    if (!this.dependencies.confirmationDisputes) {
      throw new Error('Review confirmation and dispute capability is not configured')
    }
    return this.dependencies.confirmationDisputes
  }

  private requireFlaggedModeration(): ReviewFlaggedModerationUnitOfWork {
    if (!this.dependencies.flaggedModeration) {
      throw new Error('Review flagged moderation capability is not configured')
    }
    return this.dependencies.flaggedModeration
  }

  private requireAdminDisputes(): ReviewAdminDisputeReadModel {
    if (!this.dependencies.adminDisputes) {
      throw new Error('Admin review dispute read capability is not configured')
    }
    return this.dependencies.adminDisputes
  }

  private requireOrgDisputes(): ReviewOrgDisputeReader {
    if (!this.dependencies.orgDisputes) {
      throw new Error('Organization review dispute read capability is not configured')
    }
    return this.dependencies.orgDisputes
  }
}
