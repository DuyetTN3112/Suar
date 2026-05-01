export interface AccomplishmentPublicationCacheInvalidator {
  invalidateUserWorkHistory(userId: string): Promise<void>
}
