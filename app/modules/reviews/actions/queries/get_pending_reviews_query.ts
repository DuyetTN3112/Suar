import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import { buildPaginationMeta } from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/reviews/actions/base_query'
import { buildReviewTaskAssignmentProjectionMap } from '#modules/reviews/actions/mappers/review_task_assignment_projection_mapper'
import type { ReviewModeratorIdentity } from '#modules/reviews/actions/ports/outbound/review_external_dependencies'
import type { ReviewProjectMembershipReader } from '#modules/reviews/actions/ports/outbound/review_project_membership_reader'
import type {
  ReviewAssignmentProjectionReader,
  ReviewModeratorIdentityProjectionReader,
} from '#modules/reviews/actions/ports/outbound/review_projection_enrichment_readers'
import type {
  PendingReviewSessionSource,
  ReviewSessionReadStore,
} from '#modules/reviews/actions/ports/outbound/review_session_readers'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { ReviewSessionRecord } from '#modules/reviews/types/review_records'

interface PendingReviewsDTO {
  page: number
  per_page: number
  after?: string
  before?: string
}

interface PendingReviewsResult {
  data: ReviewSessionRecord[]
  meta: {
    total: number
    per_page: number
    current_page: number
    last_page: number
    cursor: {
      next_cursor: string | null
      previous_cursor: string | null
      has_next_page: boolean
      has_previous_page: boolean
    }
  }
}

export interface GetPendingReviewsDependencies {
  projectMembership: ReviewProjectMembershipReader
  taskAssignment: Pick<
    ReviewAssignmentProjectionReader,
    'findReviewAssignmentContextsV1' | 'listAssignmentIdsByProjectIdsIncludingDeletedTasks'
  >
  moderatorIdentity: Pick<ReviewModeratorIdentityProjectionReader, 'findByIds'>
  sessions: ReviewSessionReadStore
}

function toPendingReviewSessionRecord(
  session: PendingReviewSessionSource,
  reviewersById: Map<string, ReviewModeratorIdentity>
): ReviewSessionRecord {
  return {
    id: session.id,
    task_assignment_id: session.task_assignment_id,
    reviewee_id: session.reviewee_id,
    status: session.status,
    manager_review_completed: session.manager_review_completed,
    creator_reviewer_id: session.creator_reviewer_id,
    creator_review_completed: session.creator_review_completed,
    manager_reviews_count: session.manager_reviews_count,
    peer_reviews_count: session.peer_reviews_count,
    required_peer_reviews: session.required_peer_reviews,
    required_total_reviews: session.required_total_reviews,
    minimum_manager_reviews: session.minimum_manager_reviews,
    minimum_peer_reviews: session.minimum_peer_reviews,
    confirmations: session.confirmations,
    overall_quality_score: session.overall_quality_score,
    delivery_timeliness: session.delivery_timeliness,
    requirement_adherence: session.requirement_adherence,
    communication_quality: session.communication_quality,
    code_quality_score: session.code_quality_score,
    proactiveness_score: session.proactiveness_score,
    would_work_with_again: session.would_work_with_again,
    strengths_observed: session.strengths_observed,
    areas_for_improvement: session.areas_for_improvement,
    deadline: session.deadline,
    completed_at: session.completed_at,
    created_at: session.created_at,
    updated_at: session.updated_at,
    reviewer_assignments: session.reviewer_assignments.map((assignment) => ({
      id: assignment.id,
      review_session_id: assignment.review_session_id,
      reviewer_id: assignment.reviewer_id,
      reviewer_type: assignment.reviewer_type,
      assignment_role: assignment.assignment_role,
      is_required: assignment.is_required,
      status: assignment.status,
      due_at: assignment.due_at,
      submitted_at: assignment.submitted_at,
      ...(reviewersById.has(assignment.reviewer_id)
        ? {
            reviewer: {
              id: assignment.reviewer_id,
              username: reviewersById.get(assignment.reviewer_id)?.username ?? assignment.reviewer_id,
              email: reviewersById.get(assignment.reviewer_id)?.email ?? null,
            },
          }
        : {}),
    })),
  }
}

/**
 * GetPendingReviewsQuery
 *
 * Fetches review sessions that need the current user's review.
 */
export default class GetPendingReviewsQuery extends BaseQuery<
  PendingReviewsDTO,
  PendingReviewsResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly dependencies: GetPendingReviewsDependencies
  ) {
    super(execCtx)
  }

  async handle(dto: PendingReviewsDTO): Promise<PendingReviewsResult> {
    const userId = this.getCurrentUserId()

    if (!userId) {
      const currentPage = dto.after || dto.before ? 1 : dto.page
      return {
        data: [],
        meta: {
          total: 0,
          per_page: dto.per_page,
          current_page: currentPage,
          last_page: 1,
          cursor: {
            next_cursor: null,
            previous_cursor: null,
            has_next_page: false,
            has_previous_page: false,
          },
        },
      }
    }

    // This repository exposes cursor windows, not offset pages. Keep the
    // compatibility field deterministic so different legacy `page` values
    // cannot collide in Redis and replay another request's metadata.
    const currentPage = 1
    const logicalCacheKey = this.generateCacheKey('user:pending_reviews:v3', {
      userId,
      perPage: dto.per_page,
      after: dto.after ?? '',
      before: dto.before ?? '',
    })

    const loadPendingReviews = async () => {
      const projectIds =
        await this.dependencies.projectMembership.listProjectIdsForMember(userId)
      const projectTaskAssignmentIds =
        projectIds.length > 0
          ? await this.dependencies.taskAssignment.listAssignmentIdsByProjectIdsIncludingDeletedTasks(
              projectIds
            )
          : []
      const result = await this.dependencies.sessions.findPendingForReviewer(
        userId,
        projectTaskAssignmentIds,
        {
          limit: dto.per_page,
          after: dto.after ?? null,
          before: dto.before ?? null,
        }
      )
      const identityIds = [
        ...new Set([
          ...result.data.map((session) => session.reviewee_id),
          ...result.data.flatMap((session) =>
            session.reviewer_assignments.map((assignment) => assignment.reviewer_id)
          ),
        ]),
      ]
      const assignmentIds = [...new Set(result.data.map((session) => session.task_assignment_id))]
      const [identities, assignmentFacts] = await Promise.all([
        identityIds.length > 0
          ? this.dependencies.moderatorIdentity.findByIds(identityIds)
          : Promise.resolve([]),
        assignmentIds.length > 0
          ? this.dependencies.taskAssignment.findReviewAssignmentContextsV1(assignmentIds)
          : Promise.resolve([]),
      ])
      const identityById = new Map(identities.map((identity) => [identity.id, identity]))
      const assignmentById = buildReviewTaskAssignmentProjectionMap(
        assignmentIds,
        assignmentFacts,
        'summary'
      )
      const meta = buildPaginationMeta(result.total, {
        page: currentPage,
        perPage: dto.per_page,
      })

      return {
        data: result.data.map((session) => {
          const reviewee = identityById.get(session.reviewee_id)
          const taskAssignment = assignmentById.get(session.task_assignment_id)
          if (!taskAssignment) {
            throw new InvariantViolationException(
              `Task-assignment projection missing for review session ${session.id}`
            )
          }
          return {
            ...toPendingReviewSessionRecord(session, identityById),
            ...(reviewee ? { reviewee } : {}),
            task_assignment: taskAssignment,
          }
        }),
        meta: {
          total: meta.total,
          per_page: meta.perPage,
          current_page: meta.currentPage,
          last_page: meta.lastPage,
          cursor: {
            next_cursor: result.nextCursor,
            previous_cursor: result.previousCursor,
            has_next_page: result.hasNextPage,
            has_previous_page: result.hasPreviousPage,
          },
        },
      }
    }
    const cacheKey = await this.resolveVersionedCacheKey(
      entityCacheGenerationNamespaces(
        CACHE_COLLECTION_GENERATION_NAMESPACES.pendingReviews,
        'user',
        userId
      ),
      logicalCacheKey
    )
    if (!cacheKey) {
      return loadPendingReviews()
    }

    return this.executeWithCache(cacheKey, 60, loadPendingReviews)
  }

  protected resolveVersionedCacheKey(
    namespaces: readonly string[],
    logicalKey: string
  ): Promise<string | null> {
    return cacheStore.resolveVersionedKeyBestEffort(namespaces, logicalKey)
  }
}
