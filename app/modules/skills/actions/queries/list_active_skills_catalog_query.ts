import {
  isSearchRuntimeEnabled,
  searchSkillsViaEngine,
} from '#modules/search/public_contracts/search_engine'
import SkillRepository from '#modules/skills/infra/repositories/skill_repository'

export interface ListActiveSkillsCatalogDTO {
  q?: string
  limit?: number
}

export interface ActiveSkillCatalogItem {
  id: string
  skillCode: string
  skillName: string
  categoryCode: string | null
  displayType: string | null
  description: string | null
  publishedRubricVersionId: string | null
}

export default class ListActiveSkillsCatalogQuery {
  async handle(dto: ListActiveSkillsCatalogDTO = {}): Promise<ActiveSkillCatalogItem[]> {
    const q = dto.q?.trim()

    if (q) {
      return this.searchByKeyword(q, dto.limit)
    }

    const skills = await SkillRepository.activeSkillsWithPublishedRubrics()
    return skills.map(mapSkillCatalogItem)
  }

  private async searchByKeyword(
    keyword: string,
    limit?: number
  ): Promise<ActiveSkillCatalogItem[]> {
    if (isSearchRuntimeEnabled()) {
      try {
        const engineHits = await searchSkillsViaEngine({
          q: keyword,
          limit: limit ?? 25,
        })

        if (engineHits.length > 0) {
          const ids = engineHits.map((hit) => hit.skillId)
          const skills = await SkillRepository.findActiveByIdsWithPublishedRubrics(ids)
          const order = new Map(ids.map((id, index) => [id, index]))

          if (skills.length > 0) {
            return skills
              .sort((left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0))
              .map(mapSkillCatalogItem)
          }
        }
      } catch {
        // Fall through to database keyword search when engine is unavailable.
      }
    }

    const skills = await SkillRepository.searchActiveSkillsWithPublishedRubrics(keyword, limit)
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
