export interface SkillSearchDocumentRecord {
  skillId: string
  skillCode: string
  skillName: string
  categoryCode: string
  displayType: string
  description: string | null
  isActive: boolean
  updatedAt: string
}

export interface SkillSearchDocumentReader {
  findSkillSearchDocumentRecord(skillId: string): Promise<SkillSearchDocumentRecord>
}
