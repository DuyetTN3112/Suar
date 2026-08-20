export interface TalentPublicAccomplishmentRecord {
  title: string
  conciseStatement: string
  action: string
  object: string
  taskType: string | null
  businessDomain: string | null
  problemCategory: string | null
  role: string | null
  ownershipLevel: string
  verificationStatus: 'verified' | 'partially_verified'
  confidenceBand: 'low' | 'medium' | 'high'
  publishedAt: string
  technology: string[]
  deliverableSummaries: string[]
  outcomeSummaries: string[]
  capabilityLabels: string[]
}

export interface TalentPublicAccomplishmentReader {
  listForUser(userId: string): Promise<readonly TalentPublicAccomplishmentRecord[]>
}
