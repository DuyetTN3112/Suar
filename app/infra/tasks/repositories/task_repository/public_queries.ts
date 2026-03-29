import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { DatabaseId } from '#types/database'
import { baseQuery } from './shared.js'

export const paginatePublicTasks = async (
  filters: {
    difficulty?: string | null
    min_budget?: number | null
    max_budget?: number | null
    skill_ids?: DatabaseId[] | null
    sort_by: string
    sort_order: 'asc' | 'desc'
    page: number
    perPage: number
  },
  userId?: DatabaseId | null,
  trx?: TransactionClientContract
) => {
  const query = baseQuery(trx)
    .whereIn('task_visibility', ['external', 'all'])
    .whereNull('deleted_at')
    .whereNull('assigned_to')
    .preload('organization', (orgQuery) => {
      void orgQuery.select(['id', 'name', 'logo'])
    })
    .preload('project', (projectQuery) => {
      void projectQuery.select(['id', 'name', 'owner_id']).preload('owner', (ownerQuery) => {
        void ownerQuery.select(['id', 'username', 'email', 'avatar_url'])
      })
    })
    .preload('creator', (creatorQuery) => {
      void creatorQuery.select(['id', 'username', 'email', 'avatar_url'])
    })
    .preload('parentTask', (parentTaskQuery) => {
      void parentTaskQuery.select(['id', 'title'])
    })
    .preload('required_skills_rel', (skillsQuery) => {
      void skillsQuery.preload('skill', (skillQuery) => {
        void skillQuery.select(['id', 'skill_name', 'skill_code', 'category_code', 'icon_url'])
      })
    })

  if (filters.difficulty) {
    void query.where('difficulty', filters.difficulty)
  }
  if (filters.min_budget) {
    void query.where('estimated_budget', '>=', filters.min_budget)
  }
  if (filters.max_budget) {
    void query.where('estimated_budget', '<=', filters.max_budget)
  }

  if (filters.skill_ids && filters.skill_ids.length > 0) {
    void query.whereHas('required_skills_rel', (builder) => {
      void builder.whereIn('skill_id', filters.skill_ids ?? [])
    })
  }

  switch (filters.sort_by) {
    case 'budget':
      void query.orderBy('estimated_budget', filters.sort_order)
      break
    case 'due_date':
      void query.orderBy('due_date', filters.sort_order)
      break
    default:
      void query.orderBy('created_at', filters.sort_order)
  }

  if (userId) {
    void query.withCount('applications', (appQuery) => {
      void appQuery.where('applicant_id', userId).as('user_applied')
    })
  }

  return query.paginate(filters.page, filters.perPage)
}
