import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import {
  buildPaginationMeta,
  decodeTimestampCursor,
  encodeTimestampCursor,
  normalizePagination,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { BaseQuery } from '#modules/reviews/actions/base_query'
import type { ReviewAdminDisputeReadModel } from '#modules/reviews/actions/ports/outbound/review_admin_dispute_read_model'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type {
  AdminReviewDisputeListItem,
  ListAdminReviewDisputesInput,
  ListAdminReviewDisputesResult,
} from '#modules/reviews/public_contracts/admin_review_dispute_capability'
import { REVIEW_PAGINATION } from '#modules/reviews/public_contracts/review_pagination'

export type ListAdminReviewDisputesDTO = ListAdminReviewDisputesInput
export type { AdminReviewDisputeListItem, ListAdminReviewDisputesResult }

function requireUserId(ctx: ReviewActionContext): string {
  if (!ctx.userId) {
    throw new UnauthorizedException()
  }
  return ctx.userId
}

async function requireSystemAdmin(
  actorId: string,
  readModel: ReviewAdminDisputeReadModel
): Promise<void> {
  const role = await readModel.findActorSystemRole(actorId)
  if (role === undefined) {
    throw new NotFoundException('User not found')
  }
  if (role !== 'system_admin' && role !== 'superadmin') {
    throw new ForbiddenException('Only system admin can view review disputes')
  }
}

export default class ListAdminReviewDisputesQuery extends BaseQuery<
  ListAdminReviewDisputesDTO,
  ListAdminReviewDisputesResult
> {
  constructor(
    execCtx: ReviewActionContext,
    private readonly readModel: ReviewAdminDisputeReadModel
  ) {
    super(execCtx)
  }

  async handle(dto: ListAdminReviewDisputesDTO): Promise<ListAdminReviewDisputesResult> {
    const actorId = requireUserId(this.execCtx)
    await requireSystemAdmin(actorId, this.readModel)

    const pagination = normalizePagination(
      {
        page: dto.page,
        perPage: dto.perPage,
      },
      REVIEW_PAGINATION
    )
    const decodedCursor = decodeTimestampCursor(dto.after ?? null)
    const decodedBeforeCursor = decodeTimestampCursor(dto.before ?? null)
    const isBeforeWindow = Boolean(decodedBeforeCursor && !decodedCursor)
    const snapshot = await this.readModel.listDisputes({
      filters: {
        status: dto.status,
        search: dto.search,
        requestedOutcome: dto.requestedOutcome,
        finalDecision: dto.finalDecision,
      },
      after: decodedCursor,
      before: decodedBeforeCursor,
      limit: pagination.perPage + 1,
    })
    const hasOverflow = snapshot.rows.length > pagination.perPage
    const windowRows = snapshot.rows.slice(0, pagination.perPage)
    const pageRows = isBeforeWindow ? [...windowRows].reverse() : windowRows
    const firstRow = pageRows[0]
    const lastRow = pageRows[pageRows.length - 1]
    const meta = buildPaginationMeta(snapshot.total, {
      ...pagination,
      page: decodedCursor || decodedBeforeCursor ? 1 : pagination.page,
    })

    return {
      data: pageRows.map((row) => ({
        id: row['id'] as string,
        source_type: row['source_type'] as AdminReviewDisputeListItem['source_type'],
        dispute_review_type: row[
          'dispute_review_type'
        ] as AdminReviewDisputeListItem['dispute_review_type'],
        review_session_id: (row['review_session_id'] as string | null) ?? null,
        task_assignment_id: (row['task_assignment_id'] as string | null) ?? null,
        task_id: (row['task_id'] as string | null) ?? null,
        organization_id: (row['organization_id'] as string | null) ?? null,
        project_id: (row['project_id'] as string | null) ?? null,
        sprint_id: (row['sprint_id'] as string | null) ?? null,
        reviewee_id: row['reviewee_id'] as string,
        opened_by: row['opened_by'] as string,
        status: row['status'] as string,
        dispute_reason: row['dispute_reason'] as string,
        requested_outcome: row['requested_outcome'] as string,
        final_decision: (row['final_decision'] as string | null) ?? null,
        final_rationale: (row['final_rationale'] as string | null) ?? null,
        created_at: String(row['created_at']),
        resolved_at: (row['resolved_at'] as string | null) ?? null,
        task_title: (row['task_title'] as string | null) ?? null,
        reviewee_username: (row['reviewee_username'] as string | null) ?? null,
        review_session_status: (row['review_session_status'] as string | null) ?? null,
        comments_count: Number(row['comments_count'] ?? 0),
        evidences_count: Number(row['evidences_count'] ?? 0),
        latest_case_version:
          row['latest_case_version'] === null || row['latest_case_version'] === undefined
            ? null
            : Number(row['latest_case_version']),
        ai_evaluations_count: Number(row['ai_evaluations_count'] ?? 0),
        last_error_message: (row['last_error_message'] as string | null) ?? null,
      })),
      meta: {
        total: meta.total,
        per_page: meta.perPage,
        current_page: meta.currentPage,
        last_page: meta.lastPage,
        cursor: {
          next_cursor:
            (isBeforeWindow || hasOverflow) && lastRow
              ? encodeTimestampCursor({
                  createdAt: new Date(lastRow['created_at'] as string | Date).toISOString(),
                  id: lastRow['id'] as string,
                })
              : null,
          previous_cursor:
            (decodedCursor || isBeforeWindow) && firstRow
              ? encodeTimestampCursor({
                  createdAt: new Date(firstRow['created_at'] as string | Date).toISOString(),
                  id: firstRow['id'] as string,
                })
              : null,
          has_next_page: isBeforeWindow ? Boolean(decodedBeforeCursor) : hasOverflow,
          has_previous_page: isBeforeWindow ? hasOverflow : Boolean(decodedCursor),
        },
      },
    }
  }

  execute(dto: ListAdminReviewDisputesDTO): Promise<ListAdminReviewDisputesResult> {
    return this.handle(dto)
  }
}
