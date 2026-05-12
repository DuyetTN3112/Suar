import { SearchSkillsCandidateReader } from '#composition/adapters/search/search_skills_candidate_reader'
import { searchEngineCapability } from '#composition/search/search-engine/search_engine_composition'
import { skillCatalogRepository } from '#composition/skills/skill-application/skills_application_composition'

import ListActiveSkillsCatalogQuery from '#modules/skills/actions/queries/skill-catalog/list_active_skills_catalog_query'
import type { ActiveSkillCatalogCapability } from '#modules/skills/public_contracts/active_skill_catalog'

const activeSkillCatalogQuery = new ListActiveSkillsCatalogQuery(
  new SearchSkillsCandidateReader(searchEngineCapability),
  skillCatalogRepository
)

export const activeSkillCatalogCapability: ActiveSkillCatalogCapability = {
  list: (input) => activeSkillCatalogQuery.handle(input),
}
