export interface ListActiveSkillsCatalogInput {
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

export interface ActiveSkillCatalogCapability {
  list(input?: ListActiveSkillsCatalogInput): Promise<ActiveSkillCatalogItem[]>
}

export type ListActiveSkillsCatalogDTO = ListActiveSkillsCatalogInput
