export interface TalentSearchDiscoveryDocument {
  readonly userId: string
  readonly username: string
  readonly displayName: string
  readonly headline: string | null
  readonly bio: string | null
  readonly skills: readonly string[]
  readonly canonicalSkills?: readonly string[]
  readonly skillCategories?: readonly string[]
  readonly approvedSkillAliasesText?: string | null
  readonly skillTaxonomyVersions?: readonly string[]
  readonly skillAssignmentProvenance?: readonly string[]
  readonly skillAssignmentReviewStates?: readonly string[]
  readonly skillEvidence?: readonly TalentSearchDiscoverySkillEvidence[]
  readonly technologies: readonly string[]
  readonly businessDomains: readonly string[]
  readonly problemCategories: readonly string[]
  readonly taskTypes: readonly string[]
  readonly trustScore: number
  readonly completedTasks: number
  readonly updatedAt: string
  readonly availableFrom?: string | null
}

export interface TalentSearchDiscoverySkillEvidence {
  readonly skillId: string
  readonly proficiencyCode: string
  readonly proficiencyOrder: number
  readonly source: string
  readonly reviewState: string
}
