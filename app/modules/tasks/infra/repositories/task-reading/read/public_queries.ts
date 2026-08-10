import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { DateTime } from 'luxon'

import { makeTaskReadQuery } from './task_read_query_helpers.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/access/organization_constants'
import {
  collectTaskRequirementReferenceIds,
  mapTaskRequirementProjections,
} from '#modules/tasks/actions/mappers/task-requirements/task_requirement_projection_mapper'
import type {
  TaskOrgReader,
  TaskProjectReader,
  TaskSkillReader,
  TaskUserReader,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { TaskInfraMapper } from '#modules/tasks/infra/adapters/task-authoring/task_infra_mapper'
import { calculateApplicantMatch } from '#modules/tasks/public_contracts/applicant_match'
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'

type OptionalPayloadKeys<T extends object> = {
  [Key in keyof T]-?: undefined extends T[Key] ? Key : never
}[keyof T]

type OmittedUndefined<T extends object> = {
  [Key in keyof T as Key extends OptionalPayloadKeys<T> ? never : Key]: T[Key]
} & {
  [Key in OptionalPayloadKeys<T>]?: Exclude<T[Key], undefined>
}

function omitUndefined<T extends object>(value: T): OmittedUndefined<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  ) as OmittedUndefined<T>
}


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

type PublicTaskAudienceContext = {
  userId?: string | null
  organizationId?: string | null
}

function buildPublicTasksQuery(
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

function applyPublicTaskOrder(
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

export function parsePersistedTaskRecommendationTrustData(
  value: unknown,
  userId: string
): Record<string, unknown> {
  if (value === null || value === undefined) {
    return {}
  }

  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as unknown
    } catch {
      throw new PersistedDataIntegrityException(
        'Persisted task recommendation trust data contains malformed JSON',
        {
          table: 'users',
          field: 'trust_data',
          record_id: userId,
          reason: 'invalid_json',
        }
      )
    }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new PersistedDataIntegrityException(
      'Persisted task recommendation trust data has an invalid shape',
      {
        table: 'users',
        field: 'trust_data',
        record_id: userId,
        reason: 'unexpected_shape',
      }
    )
  }

  const record = parsed as Record<string, unknown>
  const calculatedScore = record['calculated_score']
  if (
    calculatedScore !== undefined &&
    (typeof calculatedScore !== 'number' || !Number.isFinite(calculatedScore))
  ) {
    throw new PersistedDataIntegrityException(
      'Persisted task recommendation trust score has an invalid type',
      {
        table: 'users',
        field: 'trust_data.calculated_score',
        record_id: userId,
        reason: 'invalid_calculated_score',
      }
    )
  }
  return record
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
  trx?: TransactionClientContract,
  audience: PublicTaskAudienceContext = {}
) => {
  const query = buildPublicTasksQuery(filters, trx, audience)
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
  trx?: Parameters<typeof paginatePublicTasks>[2],
  skillReader?: TaskSkillReader,
  userReader?: Pick<TaskUserReader, 'findUserIdentities'>,
  orgReader?: Pick<TaskOrgReader, 'findOrganizationSummaries'>,
  projectReader?: Pick<TaskProjectReader, 'findProjectSummaries'>,
  organizationId?: string | null
) => {
  if (!skillReader) {
    throw new InvariantViolationException('paginatePublicTasksAsRecords requires a TaskSkillReader')
  }
  if (!userReader) {
    throw new InvariantViolationException('paginatePublicTasksAsRecords requires a TaskUserReader')
  }
  if (!orgReader) {
    throw new InvariantViolationException('paginatePublicTasksAsRecords requires a TaskOrgReader')
  }
  if (!projectReader) {
    throw new InvariantViolationException(
      'paginatePublicTasksAsRecords requires a TaskProjectReader'
    )
  }
  const useRecommendedSort = filters.sort_by === 'recommended' && Boolean(userId)
  const audience = {
    userId: userId ?? null,
    organizationId: organizationId ?? null,
  }
  const paginator = useRecommendedSort
    ? null
    : await paginatePublicTasks(filters, userId, trx, audience)
  const models = useRecommendedSort
    ? await buildPublicTasksQuery(filters, trx, audience)
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
  const requirementSources = models.flatMap((task) => task.required_skills_rel)
  const requirementReferences =
    requirementSources.length > 0
      ? await skillReader.findTaskRequirementReferenceFacts(
          collectTaskRequirementReferenceIds(requirementSources),
          trx
        )
      : { skills: [], proficiencyLevels: [] }
  const requirementProjections = mapTaskRequirementProjections(
    requirementSources,
    requirementReferences
  )
  const organizationIds = [...new Set(models.map((task) => task.organization_id))]
  const organizationSummaries = await orgReader.findOrganizationSummaries(organizationIds, trx)
  const organizationById = new Map(
    organizationSummaries.map((organization) => [organization.id, organization])
  )
  const projectIds = [
    ...new Set(models.flatMap((task) => (task.project_id ? [task.project_id] : []))),
  ]
  const projectSummaries = await projectReader.findProjectSummaries(projectIds, trx)
  const projectById = new Map(projectSummaries.map((project) => [project.id, project]))
  const identityIds = [
    ...new Set(
      models.flatMap((task) => {
        const projectOwnerId = task.project_id ? projectById.get(task.project_id)?.ownerId : null
        return [task.creator_id, ...(projectOwnerId ? [projectOwnerId] : [])]
      })
    ),
  ]
  const identities =
    identityIds.length > 0 ? await userReader.findUserIdentities(identityIds, trx) : []
  const identityById = new Map(identities.map((identity) => [identity.id, identity]))
  const requirementsByTaskId = new Map<string, typeof requirementProjections>()
  for (const requirement of requirementProjections) {
    const taskRequirements = requirementsByTaskId.get(requirement.task_id) ?? []
    taskRequirements.push(requirement)
    requirementsByTaskId.set(requirement.task_id, taskRequirements)
  }

  if (userId && models.length > 0) {
    const client = trx ?? db
    const taskIds = models.map((task) => task.id)
    const reviewableProjectIds = [
      ...new Set(
        models
          .map((task) => task.project_id)
          .filter(
            (projectId): projectId is string =>
              typeof projectId === 'string' && projectId.length > 0
          )
      ),
    ]
    const reviewableOrganizationIds = [
      ...new Set(
        models
          .map((task) => task.organization_id)
          .filter(
            (candidateOrganizationId): candidateOrganizationId is string =>
              typeof candidateOrganizationId === 'string' && candidateOrganizationId.length > 0
          )
      ),
    ]

    const [
      rows,
      userSkills,
      userWorkHistory,
      userRow,
      projectMemberships,
      organizationMemberships,
    ] = (await Promise.all([
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
      reviewableProjectIds.length > 0
        ? client
            .from('project_members')
            .select(['project_id'])
            .where('user_id', userId)
            .whereIn('project_id', reviewableProjectIds)
            .whereIn('project_role', ['project_owner', 'project_manager'])
        : Promise.resolve([]),
      reviewableOrganizationIds.length > 0
        ? client
            .from('organization_users')
            .select(['organization_id'])
            .where('user_id', userId)
            .where('status', OrganizationUserStatus.APPROVED)
            .whereIn('organization_id', reviewableOrganizationIds)
            .whereIn('org_role', ['org_owner', 'org_admin'])
        : Promise.resolve([]),
    ])) as [
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
    const trustData = parsePersistedTaskRecommendationTrustData(userRow?.trust_data, userId)
    trustScore =
      typeof trustData['calculated_score'] === 'number' ? trustData['calculated_score'] : 0
    const reviewProjectIds = new Set(projectMemberships.map((row) => row.project_id))
    const reviewOrganizationIds = new Set(organizationMemberships.map((row) => row.organization_id))

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

  const scoredModels = models.map((task) => {
    const requiredSkills = requirementsByTaskId.get(task.id) ?? []
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
      }) => {
        const creator = identityById.get(task.creator_id)
        const project = task.project_id ? projectById.get(task.project_id) : undefined
        const owner = project?.ownerId ? identityById.get(project.ownerId) : undefined
        const organization = organizationById.get(task.organization_id)

        return omitUndefined({
          ...TaskInfraMapper.toDetailRecord(task),
          organization: organization
            ? {
                id: organization.id,
                name: organization.name,
                logo: organization.logo,
              }
            : null,
          creator: creator
            ? {
                id: creator.id,
                username: creator.username,
              }
            : null,
          project: project
            ? {
                id: project.id,
                name: project.name,
                owner_id: project.ownerId,
                owner: owner
                  ? {
                      id: owner.id,
                      username: owner.username,
                    }
                  : null,
              }
            : null,
          required_skills_rel: requirementsByTaskId.get(task.id) ?? [],
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
      }
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
