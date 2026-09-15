import type db from '@adonisjs/lucid/services/db'

import type {
  ReviewAdminDisputeCursor,
  ReviewAdminDisputeListReadInput,
} from '#modules/disputes/actions/ports/outbound/review_admin_dispute_read_model'

export type FilterInput = ReviewAdminDisputeListReadInput['filters']

export function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function applyClassicFilters(query: ReturnType<typeof db.query>, filters: FilterInput) {
  if (filters.status?.trim()) {
    void query.where('rd.status', filters.status.trim())
  }

  if (filters.search?.trim()) {
    const needle = filters.search.trim()
    const term = `%${needle}%`
    if (isUuidLike(needle)) {
      void query.whereRaw('(rd.dispute_reason ILIKE ? OR t.title ILIKE ? OR rd.reviewee_id = ?)', [
        term,
        term,
        needle,
      ])
    } else {
      void query.whereRaw('(rd.dispute_reason ILIKE ? OR t.title ILIKE ?)', [term, term])
    }
  }

  if (filters.requestedOutcome?.trim()) {
    void query.where('rd.requested_outcome', filters.requestedOutcome.trim())
  }
  if (filters.finalDecision?.trim()) {
    void query.where('rd.final_decision', filters.finalDecision.trim())
  }
  return query
}

export function applySprintFilters(query: ReturnType<typeof db.query>, filters: FilterInput) {
  if (filters.status?.trim()) {
    void query.where('srd.status', filters.status.trim())
  }

  if (filters.search?.trim()) {
    const needle = filters.search.trim()
    const term = `%${needle}%`
    if (isUuidLike(needle)) {
      void query.whereRaw(
        '(srd.dispute_reason ILIKE ? OR ps.name ILIKE ? OR srp.reviewer_id = ?)',
        [term, term, needle]
      )
    } else {
      void query.whereRaw('(srd.dispute_reason ILIKE ? OR ps.name ILIKE ?)', [term, term])
    }
  }

  if (filters.requestedOutcome?.trim()) {
    void query.where('srd.requested_outcome', filters.requestedOutcome.trim())
  }
  if (filters.finalDecision?.trim()) {
    void query.where('srd.final_decision', filters.finalDecision.trim())
  }
  return query
}

export function applyReverseWorkflowFilters(
  query: ReturnType<typeof db.query>,
  filters: FilterInput
) {
  if (filters.status?.trim()) {
    void query.where('srw.status', filters.status.trim())
  } else {
    void query.whereIn('srw.status', ['reported', 'ai_reviewing', 'admin_reviewing', 'resolved'])
  }

  if (filters.search?.trim()) {
    const needle = filters.search.trim()
    const term = `%${needle}%`
    if (isUuidLike(needle)) {
      void query.whereRaw('(srw.comment ILIKE ? OR ps.name ILIKE ? OR srw.reviewer_id = ?)', [
        term,
        term,
        needle,
      ])
    } else {
      void query.whereRaw('(srw.comment ILIKE ? OR ps.name ILIKE ?)', [term, term])
    }
  }

  if (filters.requestedOutcome?.trim()) {
    void query.whereRaw('1 = 0')
  }
  if (filters.finalDecision?.trim()) {
    void query.where('srw.final_decision', filters.finalDecision.trim())
  }
  return query
}

export function applyTaskWorkflowFilters(query: ReturnType<typeof db.query>, filters: FilterInput) {
  if (filters.status?.trim()) {
    void query.where('trw.status', filters.status.trim())
  } else {
    void query.whereIn('trw.status', [
      'reported',
      'ai_reviewing',
      'ai_failed',
      'admin_reviewing',
      'resolved',
      // `done` is terminal for the task-review workflow, not a deletion of
      // its admin-dispute history. Keep it readable in the resolved lane.
      'done',
    ])
  }

  if (filters.search?.trim()) {
    const needle = filters.search.trim()
    const term = `%${needle}%`
    if (isUuidLike(needle)) {
      void query.whereRaw('(t.title ILIKE ? OR trw.reviewee_id = ? OR trw.reported_by = ?)', [
        term,
        needle,
        needle,
      ])
    } else {
      void query.whereRaw('(t.title ILIKE ?)', [term])
    }
  }

  if (
    filters.requestedOutcome?.trim() &&
    filters.requestedOutcome.trim() !== 'request_admin_review'
  ) {
    void query.whereRaw('1 = 0')
  }
  if (filters.finalDecision?.trim()) {
    void query.where('trw.final_decision', filters.finalDecision.trim())
  }
  return query
}

export function applyCursorWindow(
  query: ReturnType<typeof db.query>,
  alias: string,
  after: ReviewAdminDisputeCursor | null,
  before: ReviewAdminDisputeCursor | null
) {
  if (after) {
    void query.where((builder) => {
      void builder.where(`${alias}.created_at`, '<', after.createdAt).orWhere((nested) => {
        void nested
          .where(`${alias}.created_at`, after.createdAt)
          .where(`${alias}.id`, '<', after.id)
      })
    })
  } else if (before) {
    void query.where((builder) => {
      void builder.where(`${alias}.created_at`, '>', before.createdAt).orWhere((nested) => {
        void nested
          .where(`${alias}.created_at`, before.createdAt)
          .where(`${alias}.id`, '>', before.id)
      })
    })
  }
  return query
}

export function sortRows(
  rows: Record<string, unknown>[],
  direction: 'asc' | 'desc'
): Record<string, unknown>[] {
  return [...rows].sort((left, right) => {
    const leftTime = new Date(left['created_at'] as string | Date).getTime()
    const rightTime = new Date(right['created_at'] as string | Date).getTime()
    if (leftTime !== rightTime) {
      return direction === 'asc' ? leftTime - rightTime : rightTime - leftTime
    }
    const leftId = String(left['id'])
    const rightId = String(right['id'])
    return direction === 'asc' ? leftId.localeCompare(rightId) : rightId.localeCompare(leftId)
  })
}

export function latestErrorSql(alias: string, sourceType?: string): string {
  const sourceClause = sourceType
    ? `ade.source_type = '${sourceType}' AND ade.source_id::text = ${alias}.id::text`
    : `ade.dispute_id = ${alias}.id`
  return `(SELECT ade.error_message FROM ai_dispute_evaluations ade WHERE ${sourceClause} AND ade.status IN ('failed', 'cancelled') ORDER BY ade.created_at DESC, ade.id DESC LIMIT 1)`
}
