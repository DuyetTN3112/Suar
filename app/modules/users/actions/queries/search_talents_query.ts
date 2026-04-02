import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import {
  normalizePagination,
  slicePageItems,
} from '#modules/pagination/public_contracts/pagination_public_api'
import { searchFallbackObserver } from '#modules/search/public_contracts/search_fallback_observer'
import { calculateApplicantMatch } from '#modules/tasks/public_contracts/applicant_match'
import { BaseQuery } from '#modules/users/actions/base_query'
import { USER_PAGINATION } from '#modules/users/actions/dtos/common/user_pagination'
import type { TalentSearchCandidateReader } from '#modules/users/actions/ports/outbound/talent_search_candidate_reader'
import type { TalentSkillCategoryReader } from '#modules/users/actions/ports/outbound/talent_skill_category_reader'
import type { TalentTaskMatchContextReader } from '#modules/users/actions/ports/outbound/talent_task_match_context_reader'
import type {
  TalentUserRecord,
  UserTalentRepository,
} from '#modules/users/actions/ports/outbound/user_talent_repository'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import type {
  SearchTalentsDTO as SearchTalentsInput,
  TalentSearchResult,
} from '#modules/users/public_contracts/talent_search'

export interface SearchTalentsDTO extends SearchTalentsInput {
  signal?: AbortSignal
}

export type { TalentSearchResult }

interface SearchTalentsQueryDeps {
  searchCandidateReader: TalentSearchCandidateReader
  skillCategoryReader: TalentSkillCategoryReader
  taskMatchContextReader: TalentTaskMatchContextReader
  talents: UserTalentRepository
}

export default class SearchTalentsQuery extends BaseQuery<SearchTalentsDTO, TalentSearchResult[]> {
  private readonly deps: SearchTalentsQueryDeps

  constructor(execCtx: UserActionContext, deps?: Partial<SearchTalentsQueryDeps>) {
    super(execCtx)
    if (!deps?.searchCandidateReader) {
      throw new InvariantViolationException(
        'SearchTalentsQuery requires a searchCandidateReader port'
      )
    }
    if (!deps.skillCategoryReader) {
      throw new InvariantViolationException(
        'SearchTalentsQuery requires a skillCategoryReader port'
      )
    }
    if (!deps.taskMatchContextReader) {
      throw new InvariantViolationException(
        'SearchTalentsQuery requires a taskMatchContextReader port'
      )
    }
    if (!deps.talents) {
      throw new InvariantViolationException('SearchTalentsQuery requires a talents port')
    }
    this.deps = {
      searchCandidateReader: deps.searchCandidateReader,
      skillCategoryReader: deps.skillCategoryReader,
      taskMatchContextReader: deps.taskMatchContextReader,
      talents: deps.talents,
    }
  }

  async handle(dto: SearchTalentsDTO): Promise<TalentSearchResult[]> {
    const pagination = normalizePagination(
      {
        page: dto.page,
        perPage: dto.per_page,
      },
      USER_PAGINATION
    )
    const users = await this.fetchTalentUsers(dto)
    const explainabilityByUserId = await this.deps.talents.getExplainabilitySummaries(
      users.map((user) => user.id)
    )

    // 2. If task_id is specified, compute match scores and sort
    if (dto.task_id) {
      const taskLookup = dto.task_id.trim()
      const organizationId = this.getCurrentOrganizationId()
      const taskContext = await this.deps.taskMatchContextReader.findTalentTaskMatchContext(
        taskLookup,
        organizationId
      )

      if (!taskContext) {
        throw new NotFoundException('Task not found by id or title')
      }

      const talentUserIds = users.map((user) => user.id)
      const [userSkillsRows, workHistoryRows] = await Promise.all([
        this.deps.talents.listSkillMatchFacts(talentUserIds),
        this.deps.talents.listWorkHistoryMatchFacts(talentUserIds),
      ])

      const userSkillsByUserId = new Map<
        string,
        {
          skill_id: string
          verified_public_proficiency_code: string
          source: string
        }[]
      >()
      for (const row of userSkillsRows) {
        const existing = userSkillsByUserId.get(row.user_id) ?? []
        existing.push({
          skill_id: row.skill_id,
          verified_public_proficiency_code: row.verified_public_proficiency_code,
          source: row.source,
        })
        userSkillsByUserId.set(row.user_id, existing)
      }

      const workHistoryByUserId = new Map<
        string,
        {
          business_domain: string
          problem_category: string
          task_type: string
          was_on_time: boolean
        }[]
      >()
      for (const row of workHistoryRows) {
        const existing = workHistoryByUserId.get(row.user_id) ?? []
        existing.push({
          business_domain: row.business_domain,
          problem_category: row.problem_category,
          task_type: row.task_type,
          was_on_time: row.was_on_time,
        })
        workHistoryByUserId.set(row.user_id, existing)
      }

      const results: TalentSearchResult[] = []

      for (const user of users) {
        const trustData = (
          typeof user.trust_data === 'string'
            ? JSON.parse(user.trust_data)
            : (user.trust_data ?? {})
        ) as Partial<import('#modules/users/types/user_profile_data').UserTrustData>
        const trustScore = trustData.calculated_score ?? 0

        const match = calculateApplicantMatch(
          {
            requiredSkills: taskContext.requiredSkills.map((rs) => ({
              skill_id: rs.skillId,
              required_public_proficiency_code: rs.requiredPublicProficiencyCode,
              is_mandatory: rs.isMandatory,
              skill_name: rs.skillName,
              minimumLevelId: rs.minimumLevelId,
              targetLevelId: rs.targetLevelId,
              assessmentCeilingLevelId: rs.assessmentCeilingLevelId,
              importance: rs.importance,
              weight: rs.weight,
              projectSkillId: rs.projectSkillId,
              rubricVersionId: rs.rubricVersionId,
            })),
            business_domain: taskContext.businessDomain,
            problem_category: taskContext.problemCategory,
            task_type: taskContext.taskType,
          },
          {
            skills: (userSkillsByUserId.get(user.id) ?? []).map((us) => ({
              skill_id: us.skill_id,
              verified_public_proficiency_code: us.verified_public_proficiency_code,
              source: us.source,
            })),
            workHistory: (workHistoryByUserId.get(user.id) ?? []).map((wh) => ({
              business_domain: wh.business_domain,
              problem_category: wh.problem_category,
              task_type: wh.task_type,
              was_on_time: wh.was_on_time,
            })),
            trustScore,
          }
        )

        const profileSettings = (
          typeof user.profile_settings === 'string'
            ? JSON.parse(user.profile_settings)
            : (user.profile_settings ?? {})
        ) as Partial<import('#modules/users/types/user_profile_data').UserProfileSettings>
        const explainability = explainabilityByUserId.get(user.id)

        results.push({
          id: user.id,
          username: user.username,
          status: user.status,
          match_score: match.match_score,
          skill_match: match.skill_match,
          domain_match: match.domain_match,
          delivery_reliability: match.delivery_reliability,
          trust_score: match.trust_score,
          explanations: match.explanations,
          risks: match.risks,
          avatar_url: user.avatar_url,
          bio: user.bio,
          custom_headline: profileSettings.custom_headline ?? null,
          completed_tasks: user.external_contributor_completed_tasks_count,
          reviewed_skills_count: explainability?.reviewedSkillsCount ?? 0,
          imported_skills_count: explainability?.importedSkillsCount ?? 0,
          under_dispute_skills_count: explainability?.underDisputeSkillsCount ?? 0,
          latest_confidence_signal: explainability?.latestConfidenceSignal ?? null,
        })
      }

      return results.sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0))
    }

    // 3. Otherwise return simple list with pagination
    const paginatedUsers = slicePageItems(users, pagination)

    return paginatedUsers.map((u) => {
      const trustData = (
        typeof u.trust_data === 'string' ? JSON.parse(u.trust_data) : (u.trust_data ?? {})
      ) as Partial<import('#modules/users/types/user_profile_data').UserTrustData>
      const profileSettings = (
        typeof u.profile_settings === 'string'
          ? JSON.parse(u.profile_settings)
          : (u.profile_settings ?? {})
      ) as Partial<import('#modules/users/types/user_profile_data').UserProfileSettings>
      const explainability = explainabilityByUserId.get(u.id)

      return {
        id: u.id,
        username: u.username,
        status: u.status,
        trust_score: trustData.calculated_score ?? 0,
        skill_match: trustData.performance_breakdown?.quality_score ?? 0,
        domain_match: trustData.performance_breakdown?.consistency_score ?? 0,
        delivery_reliability:
          trustData.performance_score ?? trustData.performance_breakdown?.delivery_score ?? 0,
        avatar_url: u.avatar_url,
        bio: u.bio,
        custom_headline: profileSettings.custom_headline ?? null,
        completed_tasks: u.external_contributor_completed_tasks_count,
        reviewed_skills_count: explainability?.reviewedSkillsCount ?? 0,
        imported_skills_count: explainability?.importedSkillsCount ?? 0,
        under_dispute_skills_count: explainability?.underDisputeSkillsCount ?? 0,
        latest_confidence_signal: explainability?.latestConfidenceSignal ?? null,
      }
    })
  }

  private async fetchTalentUsers(dto: SearchTalentsDTO): Promise<TalentUserRow[]> {
    const categorySkillIds =
      dto.skill_categories && dto.skill_categories.length > 0
        ? await this.deps.skillCategoryReader.resolveActiveSkillIdsByCategoryCodes(
            dto.skill_categories
          )
        : null

    if (dto.q?.trim() && this.deps.searchCandidateReader.isEnabled()) {
      const pagination = normalizePagination(
        {
          page: dto.page,
          perPage: dto.per_page,
        },
        USER_PAGINATION
      )
      const limit = Math.max(pagination.page * pagination.perPage, USER_PAGINATION.DEFAULT_PER_PAGE)
      let engineResults: Awaited<ReturnType<TalentSearchCandidateReader['searchTalentCandidates']>>
      try {
        engineResults = await this.deps.searchCandidateReader.searchTalentCandidates(
          {
            q: dto.q,
            limit,
          },
          dto.signal
        )
        dto.signal?.throwIfAborted()
      } catch (error) {
        if (dto.signal?.aborted) {
          throw error
        }
        searchFallbackObserver.record({ surface: 'users.talents.list', error })
        return this.deps.talents.findDiscoverableTalents(dto, categorySkillIds)
      }

      if (engineResults.length === 0) {
        return this.deps.talents.findDiscoverableTalents(dto, categorySkillIds)
      }

      const users = await this.deps.talents.findDiscoverableTalents(
        dto,
        categorySkillIds,
        engineResults.map((result) => result.userId)
      )
      if (users.length === 0) {
        return this.deps.talents.findDiscoverableTalents(dto, categorySkillIds)
      }

      const order = new Map(engineResults.map((result, index) => [result.userId, index]))
      return users.sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
    }

    return this.deps.talents.findDiscoverableTalents(dto, categorySkillIds)
  }
}

type TalentUserRow = TalentUserRecord
