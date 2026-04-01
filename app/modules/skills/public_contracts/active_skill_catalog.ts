import ListActiveSkillsCatalogQuery, {
  type ActiveSkillCatalogItem,
  type ListActiveSkillsCatalogDTO,
} from '#modules/skills/actions/queries/list_active_skills_catalog_query'

export type { ActiveSkillCatalogItem, ListActiveSkillsCatalogDTO }

export async function listActiveSkillsCatalog(
  input: ListActiveSkillsCatalogDTO = {}
): Promise<ActiveSkillCatalogItem[]> {
  return new ListActiveSkillsCatalogQuery().handle(input)
}
