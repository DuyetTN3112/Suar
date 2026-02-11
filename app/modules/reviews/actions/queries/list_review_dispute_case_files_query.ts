import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { ReviewDisputeCaseFileResult } from '#modules/reviews/actions/commands/build_review_dispute_case_file_command'
import type { AiDisputeEvaluationSourceReader } from '#modules/reviews/actions/ports/outbound/ai_dispute_evaluation_source_reader'
import type { ReviewDisputeArtifactReader } from '#modules/reviews/actions/ports/outbound/review_dispute_artifact_reader'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'

export interface ListReviewDisputeCaseFilesDTO {
  dispute_id: string
}

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }

  return ctx.userId
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>
  return (value ?? {}) as Record<string, unknown>
}

function parseJsonArray(value: unknown): Record<string, unknown>[] {
  if (typeof value === 'string') return JSON.parse(value) as Record<string, unknown>[]
  return (value ?? []) as Record<string, unknown>[]
}

function normalize(row: Record<string, unknown>): ReviewDisputeCaseFileResult {
  return {
    id: row['id'] as string,
    dispute_id: row['dispute_id'] as string,
    case_version: Number(row['case_version']),
    created_at: toIsoLike(row['created_at']),
    created_by: (row['created_by'] as string | null) ?? null,
    task_snapshot: parseJsonObject(row['task_snapshot']),
    required_skills_snapshot: parseJsonArray(row['required_skills_snapshot']),
    acceptance_criteria_snapshot: parseJsonObject(row['acceptance_criteria_snapshot']),
    assignment_snapshot: parseJsonObject(row['assignment_snapshot']),
    submission_snapshot: parseJsonObject(row['submission_snapshot']),
    review_snapshot: parseJsonObject(row['review_snapshot']),
    skill_reviews_snapshot: parseJsonArray(row['skill_reviews_snapshot']),
    evidences_snapshot: parseJsonArray(row['evidences_snapshot']),
    self_assessment_snapshot: parseJsonObject(row['self_assessment_snapshot']),
    task_comments_snapshot: parseJsonArray(row['task_comments_snapshot']),
    task_history_snapshot: parseJsonArray(row['task_history_snapshot']),
    reviewee_profile_context_snapshot: parseJsonObject(row['reviewee_profile_context_snapshot']),
    reviewer_context_snapshot: parseJsonObject(row['reviewer_context_snapshot']),
    dispute_claim_snapshot: parseJsonObject(row['dispute_claim_snapshot']),
    completeness_score: Number(row['completeness_score']),
    missing_data: parseJsonArray(row['missing_data']).map((item) => {
      const key = item['key']
      return typeof key === 'string' ? key : ''
    }),
  }
}

function toIsoLike(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Date) return value.toISOString()
  return new Date(0).toISOString()
}

export default class ListReviewDisputeCaseFilesQuery {
  constructor(
    private execCtx: ReviewActionContext,
    private readonly artifacts: ReviewDisputeArtifactReader,
    private readonly aiSources: AiDisputeEvaluationSourceReader
  ) {}

  async execute(dto: ListReviewDisputeCaseFilesDTO): Promise<ReviewDisputeCaseFileResult[]> {
    const actorId = requireUserId(this.execCtx)
    const [actorRole, dispute] = await Promise.all([
      this.aiSources.findActorSystemRole(actorId),
      this.aiSources.findReviewDispute(dto.dispute_id),
    ])

    if (!actorRole) {
      throw new NotFoundException('User not found')
    }

    if (actorRole !== 'system_admin' && actorRole !== 'superadmin') {
      throw new ForbiddenException('Only system admin can view review dispute case files')
    }

    if (!dispute) {
      throw new NotFoundException('Review dispute not found')
    }

    const rows = await this.artifacts.listCaseFiles(dto.dispute_id)

    return rows.map(normalize)
  }
}
