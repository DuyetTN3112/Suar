export interface MarketplaceOrganizationAccessReader {
  canUseRecommendedTaskSort(organizationId: string, userId: string): Promise<boolean>
}
