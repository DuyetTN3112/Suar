/**
 * Review Types — Plain data interfaces for review domain rules.
 *
 * 100% pure, no framework dependencies.
 * Used as input to review formula functions.
 */

/**
 * Tier determination result.
 */
export interface TierResult {
  tierCode: string
  tierWeight: number
  tierName: string
}
