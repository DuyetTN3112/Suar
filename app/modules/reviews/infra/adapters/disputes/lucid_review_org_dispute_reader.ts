import db from '@adonisjs/lucid/services/db'

import type {
  ReviewOrgDisputeReadInput,
  ReviewOrgDisputeReader,
  ReviewOrgDisputeSource,
  ReviewOrgDisputeWindow,
} from '#modules/reviews/actions/ports/outbound/review_org_dispute_reader'

type OrgDisputeQuery = ReturnType<typeof db.query>

function applyFilters(query: OrgDisputeQuery, input: ReviewOrgDisputeReadInput): OrgDisputeQuery {
  if (input.status) {
    void query.where('rd.status', input.status)
  }
  if (input.searchTerm) {
    const term = `%${input.searchTerm}%`
    if (input.revieweeId) {
      void query.whereRaw('(rd.dispute_reason ILIKE ? OR t.title ILIKE ? OR rd.reviewee_id = ?)', [
        term,
        term,
        input.revieweeId,
      ])
    } else {
      void query.whereRaw('(rd.dispute_reason ILIKE ? OR t.title ILIKE ?)', [term, term])
    }
  }
  if (input.createdAtStart) {
    void query.where('rd.created_at', '>=', input.createdAtStart)
  }
  if (input.createdAtEnd) {
    void query.where('rd.created_at', '<=', input.createdAtEnd)
  }
  return query
}

export default class LucidReviewOrgDisputeReader implements ReviewOrgDisputeReader {
  async readWindow(input: ReviewOrgDisputeReadInput): Promise<ReviewOrgDisputeWindow> {
    const baseQuery = applyFilters(
      db
        .from('review_disputes as rd')
        .join('tasks as t', 't.id', 'rd.task_id')
        .leftJoin('review_sessions as rs', 'rs.id', 'rd.review_session_id')
        .leftJoin('users as reviewee', 'reviewee.id', 'rd.reviewee_id')
        .where('t.organization_id', input.organizationId),
      input
    )
    const totalRow = (await baseQuery
      .clone()
      .clearSelect()
      .countDistinct('rd.id as total')
      .first()) as { total?: number | string } | undefined
    const pageQuery = baseQuery.clone()
    const isBeforeWindow = Boolean(input.before && !input.after)

    const after = input.after
    const before = input.before
    if (after) {
      void pageQuery.where((builder) => {
        void builder
          .where('rd.created_at', '<', after.createdAt)
          .orWhere((nested) => {
            void nested
              .where('rd.created_at', after.createdAt)
              .where('rd.id', '<', after.id)
          })
      })
    } else if (before) {
      void pageQuery.where((builder) => {
        void builder
          .where('rd.created_at', '>', before.createdAt)
          .orWhere((nested) => {
            void nested
              .where('rd.created_at', before.createdAt)
              .where('rd.id', '>', before.id)
          })
      })
    }

    const rows = (await pageQuery
      .select(
        'rd.*',
        't.title as task_title',
        'rs.status as review_session_status',
        'reviewee.username as reviewee_username',
        db.raw(
          "(SELECT COUNT(*)::int FROM review_dispute_comments rdc WHERE rdc.dispute_id = rd.id AND rdc.deleted_at IS NULL) as comments_count"
        ),
        db.raw(
          "(SELECT COUNT(*)::int FROM review_dispute_evidences rde WHERE rde.dispute_id = rd.id) as evidences_count"
        )
      )
      .orderBy('rd.created_at', isBeforeWindow ? 'asc' : 'desc')
      .orderBy('rd.id', isBeforeWindow ? 'asc' : 'desc')
      .limit(input.limit + 1)) as ReviewOrgDisputeSource[]

    return {
      rows,
      total: Number(totalRow?.total ?? 0),
    }
  }
}
