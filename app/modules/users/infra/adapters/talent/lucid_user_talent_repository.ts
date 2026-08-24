import db from '@adonisjs/lucid/services/db'

import type {
  StaffingCandidateIdentitySkillFact,
  TalentSkillMatchFact,
  TalentUserRecord,
  TalentWorkHistoryMatchFact,
  UserTalentRepository,
} from '#modules/users/actions/ports/outbound/user_talent_repository'
import {
  readTalentExplainabilityProjection,
  type TalentExplainabilitySummary,
} from '#modules/users/domain/profile/talent_explainability_projection'
import * as staffingCandidateQueries from '#modules/users/infra/repositories/read/staffing_candidate_queries'
import type { SearchTalentsDTO } from '#modules/users/public_contracts/talent_search'

export class LucidUserTalentRepository implements UserTalentRepository {
  async findDiscoverableTalents(
    input: SearchTalentsDTO,
    categorySkillIds: string[] | null,
    userIds?: string[]
  ): Promise<TalentUserRecord[]> {
    let query = db
      .from('users')
      .where('status', 'active')
      .whereRaw("(profile_settings->>'is_searchable')::boolean = ?", [true])

    if (userIds) {
      if (userIds.length === 0) return []
      query = query.whereIn('id', userIds)
    } else if (input.q) {
      query = query.where('username', 'ilike', `%${input.q}%`)
    }

    this.applyDiscoveryFilters(query, input, categorySkillIds)
    return (await query.select(
      'id',
      'username',
      'status',
      'trust_data',
      'avatar_url',
      'bio',
      'profile_settings',
      'is_external_contributor',
      'external_contributor_completed_tasks_count'
    )) as TalentUserRecord[]
  }

  async listSkillMatchFacts(userIds: string[]): Promise<TalentSkillMatchFact[]> {
    if (userIds.length === 0) return []
    return db
      .from('user_skills')
      .whereIn('user_id', userIds)
      .select('user_id', 'skill_id', 'verified_public_proficiency_code', 'source')
  }

  async listWorkHistoryMatchFacts(userIds: string[]): Promise<TalentWorkHistoryMatchFact[]> {
    if (userIds.length === 0) return []
    return db
      .from('user_work_history as uwh')
      .whereIn('uwh.user_id', userIds)
      .where('uwh.is_public', true)
      .select(
        'uwh.user_id',
        'uwh.business_domain',
        'uwh.problem_category',
        'uwh.task_type',
        'uwh.was_on_time'
      )
  }

  async getExplainabilitySummaries(
    userIds: string[]
  ): Promise<Map<string, TalentExplainabilitySummary>> {
    const summaries = new Map<string, TalentExplainabilitySummary>()
    if (userIds.length === 0) return summaries

    const [skillSourceRows, userProjectionRows] = await Promise.all([
      db
        .from('user_skills')
        .whereIn('user_id', userIds)
        .groupBy('user_id', 'source')
        .select('user_id', 'source')
        .count('* as total'),
      db.from('users').whereIn('id', userIds).whereNull('deleted_at').select('id', 'trust_data'),
    ])
    for (const userId of userIds) {
      summaries.set(userId, {
        reviewedSkillsCount: 0,
        importedSkillsCount: 0,
        underDisputeSkillsCount: 0,
        latestConfidenceSignal: null,
      })
    }
    for (const row of skillSourceRows as Array<{
      user_id: string
      source: string
      total: string | number
    }>) {
      const current = summaries.get(row.user_id)
      if (!current) continue
      const total = Number(row.total)
      if (row.source === 'reviewed') current.reviewedSkillsCount = total
      if (row.source === 'imported') current.importedSkillsCount = total
    }
    for (const row of userProjectionRows as Array<{ id: string; trust_data: unknown }>) {
      const current = summaries.get(row.id)
      if (!current) continue
      const projection = readTalentExplainabilityProjection(row.trust_data, row.id)
      if (!projection) continue
      current.underDisputeSkillsCount = projection.under_dispute_skills_count
      current.latestConfidenceSignal = projection.latest_confidence_signal
    }
    return summaries
  }

  findStaffingCandidateFacts(
    skillIds: string[]
  ): Promise<StaffingCandidateIdentitySkillFact[]> {
    return staffingCandidateQueries.findIdentitySkillsBySkillIds(skillIds)
  }

  async getSkillSourceInsights(userIds: string[]) {
    if (userIds.length === 0) {
      return { reviewedUserIds: [], importedOnlyUserIds: [] }
    }

    const rows = (await db
      .from('user_skills')
      .whereIn('user_id', userIds)
      .whereIn('source', ['reviewed', 'imported'])
      .groupBy('user_id')
      .select('user_id')
      .select(
        db.raw(
          "MAX(CASE WHEN source = 'reviewed' THEN 1 ELSE 0 END)::int AS has_reviewed"
        ),
        db.raw(
          "MAX(CASE WHEN source = 'imported' THEN 1 ELSE 0 END)::int AS has_imported"
        )
      )) as Array<{
      user_id: string
      has_reviewed: number | string
      has_imported: number | string
    }>

    const reviewedUserIds: string[] = []
    const importedOnlyUserIds: string[] = []
    for (const row of rows) {
      const hasReviewed = Number(row.has_reviewed) > 0
      const hasImported = Number(row.has_imported) > 0
      if (hasReviewed) reviewedUserIds.push(row.user_id)
      else if (hasImported) importedOnlyUserIds.push(row.user_id)
    }
    return { reviewedUserIds, importedOnlyUserIds }
  }

  private applyDiscoveryFilters(
    query: ReturnType<typeof db.from>,
    input: SearchTalentsDTO,
    categorySkillIds: string[] | null
  ): void {
    const applySkillFilter = (skillIds: string[]): void => {
      void query.whereExists((builder) => {
        void builder
          .from('user_skills as us')
          .whereColumn('us.user_id', 'users.id')
          .whereIn('us.skill_id', skillIds)
      })
    }
    if (categorySkillIds !== null) {
      if (categorySkillIds.length === 0) void query.whereRaw('1 = 0')
      else applySkillFilter(categorySkillIds)
    }
    if (input.skill_ids?.length) applySkillFilter(input.skill_ids)

    const historyFilters = [
      ['business_domain', input.business_domain],
      ['task_type', input.task_type],
      ['problem_category', input.problem_category],
      ['role_in_task', input.role_in_task],
    ] as const
    for (const [column, value] of historyFilters) {
      if (!value) continue
      void query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .where('uwh.is_public', true)
          .where(`uwh.${column}`, value)
      })
    }
    for (const [column, value] of [
      ['tech_stack', input.tech_stack],
      ['domain_tags', input.domain_tags],
    ] as const) {
      const normalized = value?.trim().toLowerCase()
      if (!normalized) continue
      void query.whereExists((builder) => {
        void builder
          .from('user_work_history as uwh')
          .whereColumn('uwh.user_id', 'users.id')
          .where('uwh.is_public', true)
          .whereRaw(`LOWER(uwh.${column}::text) LIKE ?`, [`%${normalized}%`])
      })
    }
  }
}
