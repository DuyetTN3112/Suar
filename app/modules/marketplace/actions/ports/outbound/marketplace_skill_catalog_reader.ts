export interface MarketplaceActiveSkill {
  id: string
  skill_name: string
  category_code: string | null
  is_active: boolean
  [key: string]: unknown
}

export interface MarketplaceSkillCatalogReader {
  listActive(): Promise<MarketplaceActiveSkill[]>
}
