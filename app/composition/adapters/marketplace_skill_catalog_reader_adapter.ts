import { skillApplication as skillPublicApi } from '#composition/skills_application_composition'
import type {
  MarketplaceActiveSkill,
  MarketplaceSkillCatalogReader,
} from '#modules/marketplace/actions/ports/outbound/marketplace_skill_catalog_reader'

export class MarketplaceSkillCatalogReaderAdapter implements MarketplaceSkillCatalogReader {
  listActive(): Promise<MarketplaceActiveSkill[]> {
    return skillPublicApi.listActive()
  }
}
