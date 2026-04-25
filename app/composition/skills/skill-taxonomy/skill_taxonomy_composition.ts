import { taxonomyConfig } from '#config/taxonomy'
import { LucidSkillTaxonomyCatalogReader } from '#modules/skills/infra/adapters/skill-catalog/lucid_skill_taxonomy_catalog_reader'
import { SkillTaxonomyProvider } from '#modules/skills/infra/adapters/skill-catalog/skill_taxonomy_provider'

export const skillTaxonomyProvider = new SkillTaxonomyProvider(
  new LucidSkillTaxonomyCatalogReader(),
  { cursorSigningKey: taxonomyConfig.skillCursorSecret }
)
