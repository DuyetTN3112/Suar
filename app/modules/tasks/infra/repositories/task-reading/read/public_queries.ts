import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  buildPublicTasksQuery,
  applyPublicTaskOrder,
  type PublicTaskFilters,
  type PublicTaskAudienceContext,
} from './public_task_query_builder.js'
import {
  calculateTaskRecommendationScore,
  type UserSkillSummary,
  type UserWorkHistorySummary,
} from './public_task_recommendation_scorer.js'
import {
  parsePersistedTaskRecommendationTrustData,
  toDateMillis,
} from './public_task_recommendation_trust.js'

import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
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
import { ApplicationStatus } from '#modules/tasks/public_contracts/task_constants'

export type { PublicTaskFilters }
export { parsePersistedTaskRecommendationTrustData }

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
  let currentUserSkills: UserSkillSummary[] = []
  let workHistory: UserWorkHistorySummary[] = []
  let trustScore = 0
  let isOrgAdmin = false
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
    isOrgAdmin = organizationMemberships.length > 0

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
    const hasApplication = currentUserApplicationMap.has(task.id)

    const scoreResult = calculateTaskRecommendationScore({
      task,
      requiredSkills,
      currentUserSkills,
      workHistory,
      trustScore,
      hasApplication,
      userId: userId ?? null,
    })

    return {
      task,
      ...scoreResult,
    }
  })

  if (useRecommendedSort && !isOrgAdmin) {
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
