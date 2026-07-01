/** Invalidates cached profile work history after the final review gate commits. */
export interface ReviewUserWorkHistoryCacheInvalidator {
  invalidateUserWorkHistory(userId: string): Promise<void>
}
