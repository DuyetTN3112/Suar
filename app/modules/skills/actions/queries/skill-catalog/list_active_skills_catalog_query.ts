import { searchFallbackObserver } from '#modules/search/public_contracts/search_fallback_observer'
import { BaseQuery } from '#modules/skills/actions/base_query'
import type { SkillCatalogRepository } from '#modules/skills/actions/ports/outbound/skill_catalog_repository'
import type { SkillSearchCandidateReader } from '#modules/skills/actions/ports/outbound/skill_search_candidate_reader'
import type {
  ActiveSkillCatalogItem,
  ListActiveSkillsCatalogDTO,
} from '#modules/skills/public_contracts/active_skill_catalog'

export type {
  ActiveSkillCatalogItem,
  ListActiveSkillsCatalogDTO,
} from '#modules/skills/public_contracts/active_skill_catalog'

export default class ListActiveSkillsCatalogQuery extends BaseQuery<
  ListActiveSkillsCatalogDTO,
  ActiveSkillCatalogItem[]
> {
  constructor(
    private readonly searchCandidates: SkillSearchCandidateReader,
    private readonly repository: SkillCatalogRepository
  ) {
    super()
  }

  async handle(dto: ListActiveSkillsCatalogDTO = {}): Promise<ActiveSkillCatalogItem[]> {
    const q = dto.q?.trim()

    if (q) {
      return this.searchByKeyword(q, dto.limit)
    }

    const skills = await this.repository.listActiveWithPublishedRubrics()
    return skills.map(mapSkillCatalogItem)
  }


  private async searchByKeyword(
    keyword: string,
    limit?: number
  ): Promise<ActiveSkillCatalogItem[]> {
    if (this.searchCandidates.isEnabled()) {
      try {
        const engineHits = await this.searchCandidates.searchSkillCandidates({
          q: keyword,
          limit: limit ?? 25,
        })

        if (engineHits.length > 0) {
          const ids = engineHits.map((hit) => hit.skillId)
          const skills = await this.repository.findActiveByIdsWithPublishedRubrics(ids)
          const order = new Map(ids.map((id, index) => [id, index]))

          if (skills.length > 0) {
            return skills
              .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
              .map(mapSkillCatalogItem)
          }
        }
      } catch (error) {
        // Fall through to database keyword search when engine is unavailable.
        searchFallbackObserver.record({
          surface: 'skills.catalog.list',
          error,
        })
      }
    }

    const skills = await this.repository.searchActiveWithPublishedRubrics(keyword, limit)
    return skills.map(mapSkillCatalogItem)
  }
}

function mapSkillCatalogItem(skill: {
  id: string
  skill_code: string
  skill_name: string
  category_code: string | null
  display_type: string | null
  description: string | null
  rubric_versions: Array<{ id: string }>
}): ActiveSkillCatalogItem {
  return {
    id: skill.id,
    skillCode: skill.skill_code,
    skillName: skill.skill_name,
    categoryCode: skill.category_code,
    displayType: skill.display_type,
    description: skill.description,
    publishedRubricVersionId: skill.rubric_versions[0]?.id ?? null,
  }
}
