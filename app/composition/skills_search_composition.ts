import { SearchSkillsCandidateReader } from './adapters/search_skills_candidate_reader.js'
import { searchEngineCapability } from './search_engine_composition.js'
import { skillCatalogRepository } from './skills_application_composition.js'

import ListActiveSkillsCatalogQuery from '#modules/skills/actions/queries/list_active_skills_catalog_query'
import type { ActiveSkillCatalogCapability } from '#modules/skills/public_contracts/active_skill_catalog'

const activeSkillCatalogQuery = new ListActiveSkillsCatalogQuery(
  new SearchSkillsCandidateReader(searchEngineCapability),
  skillCatalogRepository
)

export const activeSkillCatalogCapability: ActiveSkillCatalogCapability = {
  list: (input) => activeSkillCatalogQuery.handle(input),
}
