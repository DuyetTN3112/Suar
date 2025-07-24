import FlaggedReview from '#infra/reviews/models/flagged_review'

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const getTotalExtra = (row: FlaggedReview | undefined): number => {
  const extras = row?.$extras as { total?: unknown } | undefined
  return toNumberValue(extras?.total)
}

export interface ListFlaggedReviewsFilters {
  search?: string
  flagType?: string
  severity?: string
  status?: string
}

export interface ListFlaggedReviewsResult {
  flaggedReviews: FlaggedReview[]
  total: number
}

export const AdminFlaggedReviewReadOps = {
  async listFlaggedReviews(
    filters: ListFlaggedReviewsFilters,
    page: number,
    perPage: number
  ): Promise<ListFlaggedReviewsResult> {
    const query = FlaggedReview.query()
      .preload('reviewer', (q) => {
        void q.select('id', 'username', 'email')
      })
      .preload('skill_review', (q) => {
        void q
          .preload('reviewer', (rq) => {
            void rq.select('id', 'username')
          })
          .preload('review_session', (rs) => {
            void rs.preload('reviewee', (u) => {
              void u.select('id', 'username')
            })
          })
      })
      .orderBy('created_at', 'desc')

    const search = filters.search
    if (search) {
      void query.whereHas('reviewer', (q) => {
        void q.where('username', 'ilike', `%${search}%`)
      })
    }

    if (filters.flagType) void query.where('flag_type', filters.flagType)
    if (filters.severity) void query.where('severity', filters.severity)
    if (filters.status) void query.where('status', filters.status)

    const result = await query.paginate(page, perPage)
    return { flaggedReviews: result.all(), total: result.total }
  },

  async getFlaggedReviewDetail(id: string): Promise<FlaggedReview | null> {
    return await FlaggedReview.query()
      .where('id', id)
      .preload('reviewer')
      .preload('skill_review', (q) => {
        void q.preload('reviewer', (rq) => {
          void rq.select('id', 'username', 'email')
        })
        void q.preload('skill', (sq) => {
          void sq.select('id', 'skill_name')
        })
        void q.preload('review_session', (rs) => {
          void rs.preload('reviewee')
          void rs.preload('task_assignment', (ta) => {
            void ta.preload('task', (taskQuery) => {
              void taskQuery.select('id', 'title', 'project_id')
            })
          })
        })
      })
      .first()
  },

  async countPending(): Promise<number> {
    return FlaggedReview.query()
      .where('status', 'pending')
      .count('* as total')
      .then((rows) => {
        return getTotalExtra(rows[0])
      })
  },
}
