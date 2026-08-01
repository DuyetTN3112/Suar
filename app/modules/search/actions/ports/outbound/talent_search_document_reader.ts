export interface TalentSearchDocumentSkillRecord {
  skillId: string
  skillName: string
}

export interface TalentSearchDocumentRecord {
  userId: string
  username: string
  headline: string | null
  bio: string | null
  status: string
  isSearchable: boolean
  skills: TalentSearchDocumentSkillRecord[]
  trustScore: number
  completedTasks: number
  reviewedSkillsCount: number
  importedSkillsCount: number
  underDisputeSkillsCount: number
  latestConfidenceSignal: 'low' | 'medium' | 'high' | null
  updatedAt: string
}

export interface TalentSearchDocumentReader {
  findTalentSearchDocumentRecord(
    userId: string
  ): Promise<TalentSearchDocumentRecord | null>
}
