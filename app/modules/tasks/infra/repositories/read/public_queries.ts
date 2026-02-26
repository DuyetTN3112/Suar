import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { makeTaskReadQuery } from './task_read_query_helpers.js'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'
import { calculateApplicantMatch } from '#modules/tasks/domain/match_formulas'
import { TaskInfraMapper } from '#modules/tasks/infra/mapper/task_infra_mapper'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'

type PublicTaskFilters = {
  keyword?: string | null
  task_ids?: string[] | null
  difficulty?: string | null
  skill_categories?: string[] | null
  skill_ids?: string[] | null
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

function buildPublicTasksQuery(filters: PublicTaskFilters, trx?: TransactionClientContract) {
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
    .whereIn('task_visibility', ['external', 'all'])
    .whereNull('tasks.deleted_at')
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
        'rubric_version_id',
      ])
      void skillsQuery.preload('skill', (skillQuery) => {
        void skillQuery.select(['id', 'skill_name', 'skill_code', 'category_code', 'icon_url'])
      })
      void skillsQuery.preload('minimumLevel', (levelQuery) => {
        void levelQuery.select(['id', 'code', 'display_name', 'short_name', 'ordinal'])
      })
      void skillsQuery.preload('targetLevel', (levelQuery) => {
        void levelQuery.select(['id', 'code', 'display_name', 'short_name', 'ordinal'])
      })
      void skillsQuery.preload('assessmentCeilingLevel', (levelQuery) => {
        void levelQuery.select(['id', 'code', 'display_name', 'short_name', 'ordinal'])
      })
    })

  applyPublicTaskFilters(query, filters)

  return query
}

function applyPublicTaskFilters(
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
    void query.whereHas('required_skills_rel', (builder) => {
      void builder.whereIn('skill_id', skillIds)
    })
  }

  if (filters.skill_categories && filters.skill_categories.length > 0) {
    const skillCategories = filters.skill_categories
    void query.whereHas('required_skills_rel', (builder) => {
      void builder.whereIn(
        'skill_id',
        db.from('skills').select('id').whereIn('category_code', skillCategories)
      )
    })
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

function applyPublicTaskOrder(query: ReturnType<typeof makeTaskReadQuery>, filters: PublicTaskFilters): void {
  switch (filters.sort_by) {
    case 'due_date':
      void query.orderBy('due_date', filters.sort_order)
      break
    default:
      void query.orderBy('created_at', filters.sort_order)
  }

  void query.orderBy('id', filters.sort_order)
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function toDateMillis(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime()
  }

  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis()
  }

  if (typeof value === 'string') {
    return new Date(value).getTime()
  }

  return 0
}

function currentSqlTimestamp(): string {
  return DateTime.now().toSQL()
}

export const paginatePublicTasks = async (
  filters: PublicTaskFilters,
  userId?: string | null,
  trx?: TransactionClientContract
) => {
  const query = buildPublicTasksQuery(filters, trx)
  applyPublicTaskOrder(query, filters)

  if (userId) {
    void query.withCount('applications', (appQuery) => {
      void appQuery
        .where('applicant_id', userId)
        .whereNot('application_status', ApplicationStatus.WITHDRAWN)
        .as('user_applied')
    })
  }

  return query.paginate(filters.page, filters.perPage)
}

export const paginatePublicTasksAsRecords = async (
  filters: Parameters<typeof paginatePublicTasks>[0],
  userId?: Parameters<typeof paginatePublicTasks>[1],
  trx?: Parameters<typeof paginatePublicTasks>[2]
) => {
  const useRecommendedSort = filters.sort_by === 'recommended' && Boolean(userId)
  const paginator = useRecommendedSort ? null : await paginatePublicTasks(filters, userId, trx)
  const models = useRecommendedSort
    ? await buildPublicTasksQuery(filters, trx)
      .orderBy('created_at', 'desc')
      .orderBy('id', 'desc')
    : (paginator?.all() ?? [])
  const currentUserApplicationMap = new Map<
    string,
    { id: string; status: 'pending' | 'approved' | 'rejected' }
  >()
  const reviewableTaskIds = new Set<string>()
  let currentUserSkills: {
    skill_id: string
    verified_public_proficiency_code: string
    source: 'imported' | 'reviewed'
  }[] = []
  let workHistory: {
    business_domain: string | null
    problem_category: string | null
    task_type: string | null
    was_on_time: boolean | null
  }[] = []
  let trustScore = 0

  if (userId && models.length > 0) {
    const client = trx ?? db
    const taskIds = models.map((task) => task.id)
    const projectIds = [
      ...new Set(
        models
          .map((task) => task.project_id)
          .filter((projectId): projectId is string => typeof projectId === 'string' && projectId.length > 0)
      ),
    ]
    const organizationIds = [
      ...new Set(
        models
          .map((task) => task.organization_id)
          .filter((organizationId): organizationId is string => typeof organizationId === 'string' && organizationId.length > 0)
      ),
    ]

    const [rows, userSkills, userWorkHistory, userRow, projectMemberships, organizationMemberships] = await Promise.all([
      client
      .from('task_applications')
      .select(['id', 'task_id', 'application_status'])
      .where('applicant_id', userId)
      .whereIn('task_id', taskIds)
      .whereNot('application_status', ApplicationStatus.WITHDRAWN),
      client
        .from('user_skills')
        .select(['skill_id', 'verified_public_proficiency_code', 'source'])
        .where('user_id', userId),
      client
        .from('user_work_history')
        .select(['business_domain', 'problem_category', 'task_type', 'was_on_time'])
        .where('user_id', userId),
      client.from('users').select(['trust_data']).where('id', userId).first(),
      projectIds.length > 0
        ? client
          .from('project_members')
          .select(['project_id'])
          .where('user_id', userId)
          .whereIn('project_id', projectIds)
          .whereIn('project_role', ['project_owner', 'project_manager'])
        : Promise.resolve([]),
      organizationIds.length > 0
        ? client
          .from('organization_users')
          .select(['organization_id'])
          .where('user_id', userId)
          .where('status', OrganizationUserStatus.APPROVED)
          .whereIn('organization_id', organizationIds)
          .whereIn('org_role', ['org_owner', 'org_admin'])
        : Promise.resolve([]),
    ]) as [
      {
        id: string
        task_id: string
        application_status: 'pending' | 'approved' | 'rejected'
      }[],
      {
        skill_id: string
        verified_public_proficiency_code: string | null
        source: 'imported' | 'reviewed' | null
      }[],
      {
        business_domain: string | null
        problem_category: string | null
        task_type: string | null
        was_on_time: boolean | null
      }[],
      { trust_data: unknown } | null,
      { project_id: string }[],
      { organization_id: string }[],
    ]

    currentUserSkills = userSkills.map((row) => ({
      skill_id: row.skill_id,
      verified_public_proficiency_code: row.verified_public_proficiency_code ?? 'l1',
      source: row.source ?? 'imported',
    }))
    workHistory = userWorkHistory
    const trustData = parseJsonRecord(userRow?.trust_data)
    trustScore = typeof trustData['calculated_score'] === 'number' ? trustData['calculated_score'] : 0
    const reviewProjectIds = new Set(projectMemberships.map((row) => row.project_id))
    const reviewOrganizationIds = new Set(
      organizationMemberships.map((row) => row.organization_id)
    )

    for (const row of rows) {
      currentUserApplicationMap.set(row.task_id, {
        id: row.id,
        status: row.application_status,
      })
    }

    for (const task of models) {
      if (
        task.creator_id === userId ||
        (task.project_id && reviewProjectIds.has(task.project_id)) ||
        reviewOrganizationIds.has(task.organization_id)
      ) {
        reviewableTaskIds.add(task.id)
      }
    }
  }

  const scoredModels = models
    .map((task) => {
      const requiredSkills = task.required_skills_rel
      const currentUserSkillIds = new Set(currentUserSkills.map((skill) => skill.skill_id))
      const matchedSkills = requiredSkills.filter((skill) =>
        currentUserSkillIds.has(skill.skill_id)
      ).length
      const matchedMandatorySkills = requiredSkills.filter(
        (skill) => skill.is_mandatory && currentUserSkillIds.has(skill.skill_id)
      ).length
      const hasApplication = currentUserApplicationMap.has(task.id)
      const visibilityBoost = task.task_visibility === 'all' ? 2 : 1
      const contextBoost =
        Number(Boolean(task.acceptance_criteria)) +
        Number(Boolean(task.verification_method)) +
        Number(Boolean(task.context_background))
      const profileMatch = userId
        ? calculateApplicantMatch(
          {
            requiredSkills: requiredSkills.map((skill) => ({
              skill_id: skill.skill_id,
              required_public_proficiency_code: skill.required_public_proficiency_code,
              is_mandatory: skill.is_mandatory,
              skill_name: skill.skill.skill_name,
              minimumLevelId: skill.minimum_level_id,
              targetLevelId: skill.target_level_id,
              assessmentCeilingLevelId: skill.assessment_ceiling_level_id,
              importance: skill.importance,
              weight: skill.weight,
              projectSkillId: skill.project_skill_id,
              rubricVersionId: skill.rubric_version_id,
            })),
            business_domain: task.business_domain ?? null,
            problem_category: task.problem_category ?? null,
            task_type: task.task_type,
          },
          {
            skills: currentUserSkills,
            workHistory,
            trustScore,
          }
        )
        : null

      return {
        task,
        priorityScore:
          (profileMatch?.match_score ?? 0) +
          matchedSkills * 10 +
          matchedMandatorySkills * 15 +
          visibilityBoost * 2 +
          contextBoost -
          (hasApplication ? 20 : 0),
        recommendationReasons: profileMatch?.explanations.slice(0, 3) ?? [],
        evidenceWarnings: profileMatch?.evidence_warnings.slice(0, 3) ?? [],
        recommendationRisks: profileMatch?.risks.slice(0, 3) ?? [],
        evidenceConfidence: profileMatch?.evidence_confidence ?? null,
        skillMatch: profileMatch?.skill_match ?? null,
        domainMatch: profileMatch?.domain_match ?? null,
      }
    })

  if (useRecommendedSort) {
    scoredModels.sort((left, right) => {
      const scoreDelta = right.priorityScore - left.priorityScore
      if (scoreDelta !== 0) return scoreDelta

      const createdDelta = toDateMillis(right.task.created_at) - toDateMillis(left.task.created_at)
      if (createdDelta !== 0) return createdDelta

      return right.task.id.localeCompare(left.task.id)
    })
  }

  const visibleScoredModels = useRecommendedSort
    ? scoredModels.slice((filters.page - 1) * filters.perPage, filters.page * filters.perPage)
    : scoredModels

  return {
    data: visibleScoredModels.map(
      ({
        task,
        priorityScore,
        recommendationReasons,
        evidenceWarnings,
        recommendationRisks,
        evidenceConfidence,
        skillMatch,
        domainMatch,
      }) =>
        omitUndefined({
          ...TaskInfraMapper.toDetailRecord(task),
          can_review_applications: reviewableTaskIds.has(task.id),
          current_user_application: currentUserApplicationMap.get(task.id),
          priority_score: priorityScore,
          recommendation_reasons: recommendationReasons,
          evidence_warnings: evidenceWarnings,
          recommendation_risks: recommendationRisks,
          evidence_confidence: evidenceConfidence,
          skill_match: skillMatch,
          domain_match: domainMatch,
          // Deprecated compatibility: marketplace listing priority used to be exposed as match_score.
          match_score: priorityScore,
        })
    ),
    meta: {
      total: useRecommendedSort ? scoredModels.length : (paginator?.total ?? 0),
      per_page: useRecommendedSort ? filters.perPage : (paginator?.perPage ?? filters.perPage),
      current_page: useRecommendedSort ? filters.page : (paginator?.currentPage ?? filters.page),
      last_page: useRecommendedSort
        ? Math.max(1, Math.ceil(scoredModels.length / filters.perPage))
        : (paginator?.lastPage ?? 1),
    },
  }
}
