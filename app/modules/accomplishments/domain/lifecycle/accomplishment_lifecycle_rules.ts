import type {
  AccomplishmentLifecycleStateV1,
  AccomplishmentVisibilityV1,
} from '#modules/accomplishments/public_contracts/verified-work/accomplishment_contract_primitives_v1'
import type { AccomplishmentLifecycleRevisionV1 } from '#modules/accomplishments/public_contracts/lifecycle/accomplishment_lifecycle_v1'

export const ACCOMPLISHMENT_LIFECYCLE_CODES = Object.freeze({
  invalidTransition: 'TVA.ACCOMPLISHMENT.LIFECYCLE.INVALID_TRANSITION',
  reasonMismatch: 'TVA.ACCOMPLISHMENT.LIFECYCLE.REASON_MISMATCH',
  visibilityMutation: 'TVA.ACCOMPLISHMENT.LIFECYCLE.VISIBILITY_MUTATION',
  publicationNotVerified: 'TVA.ACCOMPLISHMENT.LIFECYCLE.PUBLICATION_NOT_VERIFIED',
  terminalState: 'TVA.ACCOMPLISHMENT.LIFECYCLE.TERMINAL_STATE',
} as const)

export type AccomplishmentLifecycleCode =
  (typeof ACCOMPLISHMENT_LIFECYCLE_CODES)[keyof typeof ACCOMPLISHMENT_LIFECYCLE_CODES]

export interface AccomplishmentLifecycleTransitionInput {
  readonly previousState: AccomplishmentLifecycleStateV1 | null
  readonly nextState: AccomplishmentLifecycleStateV1
  readonly previousVisibility: AccomplishmentVisibilityV1 | null
  readonly nextVisibility: AccomplishmentVisibilityV1
  readonly reasonCode: AccomplishmentLifecycleRevisionV1['reasonCode']
}

export interface AccomplishmentLifecycleTransitionResult {
  readonly allowed: boolean
  readonly blockerCodes: readonly AccomplishmentLifecycleCode[]
}

type Transition = `${AccomplishmentLifecycleStateV1 | 'none'}->${AccomplishmentLifecycleStateV1}`

const TRANSITIONS_BY_REASON: Readonly<
  Record<AccomplishmentLifecycleRevisionV1['reasonCode'], ReadonlySet<Transition>>
> = {
  candidate_created: new Set(['none->candidate']),
  review_started: new Set(['candidate->under_review']),
  verification_completed: new Set(['under_review->verified']),
  partial_verification_completed: new Set(['under_review->partially_verified']),
  dispute_opened: new Set([
    'candidate->frozen',
    'under_review->frozen',
    'verified->frozen',
    'partially_verified->frozen',
  ]),
  dispute_resolved: new Set([
    'frozen->candidate',
    'frozen->under_review',
    'frozen->verified',
    'frozen->partially_verified',
  ]),
  publication_changed: new Set([
    'verified->verified',
    'partially_verified->partially_verified',
  ]),
  correction_issued: new Set([
    'verified->superseded',
    'partially_verified->superseded',
    'frozen->superseded',
  ]),
  superseded: new Set([
    'candidate->superseded',
    'under_review->superseded',
    'verified->superseded',
    'partially_verified->superseded',
    'frozen->superseded',
  ]),
  governance_revoked: new Set([
    'candidate->revoked',
    'under_review->revoked',
    'verified->revoked',
    'partially_verified->revoked',
    'frozen->revoked',
  ]),
}

const ALL_TRANSITIONS = new Set(
  Object.values(TRANSITIONS_BY_REASON).flatMap((transitions) => [...transitions])
)

export function validateAccomplishmentLifecycleTransition(
  input: AccomplishmentLifecycleTransitionInput
): AccomplishmentLifecycleTransitionResult {
  const blockers = new Set<AccomplishmentLifecycleCode>()
  const transition: Transition = `${input.previousState ?? 'none'}->${input.nextState}`
  if (input.previousState === 'superseded' || input.previousState === 'revoked') {
    blockers.add(ACCOMPLISHMENT_LIFECYCLE_CODES.terminalState)
  }
  if (!ALL_TRANSITIONS.has(transition)) {
    blockers.add(ACCOMPLISHMENT_LIFECYCLE_CODES.invalidTransition)
  }
  if (!TRANSITIONS_BY_REASON[input.reasonCode].has(transition)) {
    blockers.add(ACCOMPLISHMENT_LIFECYCLE_CODES.reasonMismatch)
  }

  const visibilityChanged =
    input.previousVisibility !== null && input.previousVisibility !== input.nextVisibility
  if (visibilityChanged && input.reasonCode !== 'publication_changed' && input.nextState !== 'frozen') {
    blockers.add(ACCOMPLISHMENT_LIFECYCLE_CODES.visibilityMutation)
  }
  if (
    input.nextVisibility === 'public' &&
    input.nextState !== 'verified' &&
    input.nextState !== 'partially_verified'
  ) {
    blockers.add(ACCOMPLISHMENT_LIFECYCLE_CODES.publicationNotVerified)
  }

  return { allowed: blockers.size === 0, blockerCodes: [...blockers].sort() }
}
