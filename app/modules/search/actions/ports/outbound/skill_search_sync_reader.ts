export interface SkillSearchSyncReader {
  listActiveSkillIds(): Promise<string[]>
}
