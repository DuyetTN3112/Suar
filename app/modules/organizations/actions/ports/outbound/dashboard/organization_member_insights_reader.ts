export interface OrganizationMemberInsightStats {
  reviewedMembers: number
  importedOnlyMembers: number
  underDisputeMembers: number
}

/**
 * Consumer-owned dashboard projection assembled from Users- and Reviews-owned facts.
 *
 * Organizations supplies the approved member IDs; providers keep ownership of
 * skill-evidence and dispute semantics.
 */
export abstract class OrganizationMemberInsightsReader {
  abstract loadForMemberUserIds(
    memberUserIds: string[]
  ): Promise<OrganizationMemberInsightStats>
}
