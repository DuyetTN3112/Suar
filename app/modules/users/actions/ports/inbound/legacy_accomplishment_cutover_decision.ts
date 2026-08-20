/**
 * Consumer-owned read/write decision supplied by composition during rollout.
 * The Users module must not depend on Accomplishments domain internals.
 */
export interface LegacyAccomplishmentCutoverDecision {
  readonly allowLegacyRead: boolean
  readonly allowNewRead: boolean
  readonly allowNewWrite: boolean
}
