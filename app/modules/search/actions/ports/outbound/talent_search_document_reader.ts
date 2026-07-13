export interface TalentSearchDocumentSkillRecord {
  skillId: string
  skillName: string
  canonicalRef?: string
  categoryRefs?: readonly string[]
  approvedAliases?: readonly string[]
  taxonomyVersion?: number
  assignmentProvenance?: string
  assignmentReviewState?: string
  proficiencyCode?: string
  proficiencyOrder?: number
  evidenceSource?: string
  evidenceReviewState?: string
}

/** Search-owned projection facts; the source module may provide these structurally. */
export interface TalentSearchDocumentAccomplishmentRecord {
  title: string
  conciseStatement: string
  action: string
  object: string
  taskType: string | null
  businessDomain: string | null
  problemCategory: string | null
  role: string | null
  technology: string[]
  deliverableSummaries: string[]
  outcomeSummaries: string[]
  capabilityLabels: string[]
}

export interface TalentSearchDocumentRecord {
  userId: string
  username: string
  headline: string | null
  bio: string | null
  status: string
  isSearchable: boolean
  skills: TalentSearchDocumentSkillRecord[]
  publicAccomplishments?: readonly TalentSearchDocumentAccomplishmentRecord[]
  trustScore: number
  completedTasks: number
  reviewedSkillsCount: number
  importedSkillsCount: number
  underDisputeSkillsCount: number
  latestConfidenceSignal: 'low' | 'medium' | 'high' | null
  availableFrom?: string | null
  updatedAt: string
}

export interface TalentSearchDocumentReader {
  findTalentSearchDocumentRecord(
    userId: string
  ): Promise<TalentSearchDocumentRecord | null>
}
