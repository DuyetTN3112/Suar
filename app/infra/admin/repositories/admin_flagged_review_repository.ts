import FlaggedReview from '#models/flagged_review'
import { DateTime } from 'luxon'

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

export default class AdminFlaggedReviewRepository {
  async listFlaggedReviews(
    filters: ListFlaggedReviewsFilters,
    page: number,
    perPage: number
  ): Promise<ListFlaggedReviewsResult> {
    const query = FlaggedReview.query()
      .preload('reviewer', (q) => q.select('id', 'username', 'email'))
      .preload('skill_review', (q) => {
        q.preload('reviewer', (rq) => rq.select('id', 'username'))
          .preload('review_session', (rs) => {
            rs.preload('reviewee', (u) => u.select('id', 'username'))
          })
      })
      .orderBy('created_at', 'desc')

    if (filters.search) {
      query.whereHas('reviewer', (q) => {
        q.where('username', 'ilike', `%${filters.search}%`)
      })
    }

    if (filters.flagType) query.where('flag_type', filters.flagType)
    if (filters.severity) query.where('severity', filters.severity)
    if (filters.status) query.where('status', filters.status)

    const result = await query.paginate(page, perPage)
    return { flaggedReviews: result.all(), total: result.total }
  }

  async findById(id: string): Promise<FlaggedReview | null> {
    return await FlaggedReview.query()
      .where('id', id)
      .preload('reviewer')
      .preload('skill_review', (q) => {
        q.preload('review_session', (rs) => rs.preload('reviewee'))
      })
      .first()
  }

  async resolve(id: string, action: 'dismiss' | 'confirm', notes?: string): Promise<void> {
    const fr = await FlaggedReview.findOrFail(id)
    fr.status = action === 'dismiss' ? 'dismissed' : 'confirmed'
    fr.notes = notes || null
    fr.reviewed_at = DateTime.now()
    await fr.save()
  }
}
