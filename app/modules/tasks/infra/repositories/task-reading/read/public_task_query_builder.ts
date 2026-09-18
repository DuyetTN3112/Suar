import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { currentSqlTimestamp } from './public_task_recommendation_trust.js'
import { makeTaskReadQuery } from './task_read_query_helpers.js'

export type PublicTaskFilters = {
  keyword?: string | null
  task_ids?: string[] | null
  ranked_task_ids?: string[] | null
  difficulty?: string | null
  category_skill_ids?: string[] | null
  skill_ids?: string[] | null
  skill_match?: 'any' | 'all'
  task_type?: string | null
  business_domain?: string | null
  problem_category?: string | null
  role_in_task?: string | null
  verification_method?: string | null
  tech_stack?: string | null
  domain_tags?: string | null
  accepting_applications?: 'open' | 'closed' | null
  sort_by: string
  sort_order: 'asc' | 'desc'
  page: number
  perPage: number
}

export type PublicTaskAudienceContext = {
  userId?: string | null
  organizationId?: string | null
}

export function buildPublicTasksQuery(
  filters: PublicTaskFilters,
  trx?: TransactionClientContract,
  audience: PublicTaskAudienceContext = {}
) {
  const query = makeTaskReadQuery(trx)
    .select([
      'tasks.id',
      'tasks.title',
      'tasks.description',
      'tasks.difficulty',
      'tasks.due_date',
      'tasks.application_deadline',
      'tasks.task_type',
      'tasks.acceptance_criteria',
      'tasks.verification_method',
      'tasks.expected_deliverables',
      'tasks.context_background',
      'tasks.tech_stack',
      'tasks.measurable_outcomes',
      'tasks.domain_tags',
      'tasks.role_in_task',
      'tasks.problem_category',
      'tasks.business_domain',
      'tasks.task_visibility',
      'tasks.organization_id',
      'tasks.project_id',
      'tasks.creator_id',
      'tasks.created_at',
      'tasks.updated_at',
      'tasks.parent_task_id',
    ])
    .whereNull('tasks.deleted_at')
    .whereNull('assigned_to')
    .preload('parentTask', (parentTaskQuery) => {
      void parentTaskQuery.select(['id', 'title'])
    })
    .preload('required_skills_rel', (skillsQuery) => {
      void skillsQuery.select([
        'id',
        'task_id',
        'skill_id',
        'required_public_proficiency_code',
        'is_mandatory',
        'minimum_level_id',
        'target_level_id',
        'assessment_ceiling_level_id',
        'importance',
        'weight',
        'project_skill_id',
        'source_project_professional_role_id',
        'source_role_skill_id',
        'rubric_version_id',
        'proficiency_level_id',
        'requirement_source',
        'requirement_notes',
        'created_at',
      ])
      void skillsQuery.orderBy('created_at', 'asc').orderBy('id', 'asc')
    })

  // Public marketplace discovery is the intersection of task visibility and
  // project exposure. Internal organization opportunities are a separate,
  // authenticated channel and must never leak to the public marketplace.
  void query.where((builder) => {
    void builder.where((publicBuilder) => {
      void publicBuilder
        .whereIn('tasks.task_visibility', ['external', 'all'])
        .whereExists((projectQuery) => {
          void projectQuery
            .from('projects as marketplace_project')
            .whereRaw('marketplace_project.id = tasks.project_id')
            .where('marketplace_project.visibility', 'public')
            .where('marketplace_project.allow_external_contributors', true)
            .whereNull('marketplace_project.deleted_at')
        })
    })

    const audienceUserId = audience.userId
    const audienceOrganizationId = audience.organizationId
    if (audienceUserId && audienceOrganizationId) {
      void builder.orWhere((internalBuilder) => {
        void internalBuilder
          .where('tasks.task_visibility', 'internal')
          .where('tasks.organization_id', audienceOrganizationId)
          .whereExists((membershipQuery) => {
            void membershipQuery
              .from('organization_users as marketplace_membership')
              .whereRaw('marketplace_membership.organization_id = tasks.organization_id')
              .where('marketplace_membership.user_id', audienceUserId)
              .where('marketplace_membership.status', 'approved')
          })
      })
    }
  })

  applyPublicTaskFilters(query, filters)

  return query
}

export function applyPublicTaskFilters(
  query: ReturnType<typeof makeTaskReadQuery>,
  filters: PublicTaskFilters
): void {
  if (filters.keyword) {
    const term = `%${filters.keyword.trim().toLowerCase()}%`
    void query.where((builder) => {
      void builder
        .whereRaw('LOWER(tasks.title) LIKE ?', [term])
        .orWhereRaw('LOWER(tasks.description) LIKE ?', [term])
        .orWhereRaw('LOWER(tasks.task_type) LIKE ?', [term])
        .orWhereRaw('LOWER(tasks.role_in_task) LIKE ?', [term])
        .orWhereRaw('LOWER(tasks.problem_category) LIKE ?', [term])
        .orWhereRaw('LOWER(tasks.business_domain) LIKE ?', [term])
        .orWhereRaw('LOWER(tasks.tech_stack::text) LIKE ?', [term])
        .orWhereRaw('LOWER(tasks.domain_tags::text) LIKE ?', [term])
    })
  }

  if (filters.task_ids && filters.task_ids.length > 0) {
    void query.whereIn('tasks.id', filters.task_ids)
  }

  if (filters.difficulty) {
    void query.where('difficulty', filters.difficulty)
  }

  if (filters.task_type) {
    void query.where('task_type', filters.task_type)
  }

  if (filters.business_domain) {
    void query.where('business_domain', filters.business_domain)
  }

  if (filters.problem_category) {
    void query.where('problem_category', filters.problem_category)
  }

  if (filters.role_in_task) {
    void query.where('role_in_task', filters.role_in_task)
  }

  if (filters.verification_method) {
    void query.whereRaw('LOWER(tasks.verification_method) LIKE ?', [
      `%${filters.verification_method.trim().toLowerCase()}%`,
    ])
  }

  if (filters.tech_stack) {
    void query.whereRaw('LOWER(tasks.tech_stack::text) LIKE ?', [
      `%${filters.tech_stack.trim().toLowerCase()}%`,
    ])
  }

  if (filters.domain_tags) {
    void query.whereRaw('LOWER(tasks.domain_tags::text) LIKE ?', [
      `%${filters.domain_tags.trim().toLowerCase()}%`,
    ])
  }

  if (filters.skill_ids && filters.skill_ids.length > 0) {
    const skillIds = filters.skill_ids
    if (filters.skill_match === 'all') {
      for (const skillId of skillIds) {
        void query.whereHas('required_skills_rel', (builder) => {
          void builder.where('skill_id', skillId)
        })
      }
    } else {
      void query.whereHas('required_skills_rel', (builder) => {
        void builder.whereIn('skill_id', skillIds)
      })
    }
  }

  if (filters.category_skill_ids !== null && filters.category_skill_ids !== undefined) {
    const categorySkillIds = filters.category_skill_ids
    if (categorySkillIds.length === 0) {
      void query.whereRaw('1 = 0')
    } else {
      void query.whereHas('required_skills_rel', (builder) => {
        void builder.whereIn('skill_id', categorySkillIds)
      })
    }
  }

  if (filters.accepting_applications === 'open') {
    const now = currentSqlTimestamp()
    void query.where((builder) => {
      void builder.whereNull('application_deadline').orWhere('application_deadline', '>=', now)
    })
  }

  if (filters.accepting_applications === 'closed') {
    const now = currentSqlTimestamp()
    void query.whereNotNull('application_deadline').where('application_deadline', '<', now)
  }
}

export function applyPublicTaskOrder(
  query: ReturnType<typeof makeTaskReadQuery>,
  filters: PublicTaskFilters
): void {
  if (filters.ranked_task_ids && filters.ranked_task_ids.length > 0) {
    const rankedTaskIds = filters.ranked_task_ids
    const rankCases = rankedTaskIds.map((_taskId, index) => `WHEN ? THEN ${index}`).join(' ')
    void query.orderByRaw(
      `CASE tasks.id::text ${rankCases} ELSE ${rankedTaskIds.length} END ASC`,
      rankedTaskIds
    )
    void query.orderBy('tasks.id', 'asc')
    return
  }

  switch (filters.sort_by) {
    case 'due_date':
      void query.orderBy('due_date', filters.sort_order)
      break
    default:
      void query.orderBy('created_at', filters.sort_order)
  }

  void query.orderBy('id', filters.sort_order)
}
