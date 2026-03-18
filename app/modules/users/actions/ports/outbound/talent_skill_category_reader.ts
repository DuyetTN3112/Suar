export interface TalentSkillCategoryReader {
  resolveActiveSkillIdsByCategoryCodes(categoryCodes: string[]): Promise<string[]>
}
