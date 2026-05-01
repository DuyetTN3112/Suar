import { BaseCommand } from '#modules/accomplishments/actions/base_command'
import type {
  AccomplishmentLifecycleGovernanceWriter,
  GovernAccomplishmentLifecycleInput,
  PersistedAccomplishmentLifecycleTransition,
} from '#modules/accomplishments/actions/ports/outbound/lifecycle/accomplishment_lifecycle_governance_writer'
import {
  validateAccomplishmentLifecycleTransition,
  type AccomplishmentLifecycleCode,
} from '#modules/accomplishments/domain/lifecycle/accomplishment_lifecycle_rules'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'

export const ACCOMPLISHMENT_GOVERNANCE_CODES = Object.freeze({
  invalidExpectedSequence: 'TVA.ACCOMPLISHMENT.GOVERNANCE.INVALID_EXPECTED_SEQUENCE',
  sourceTypeMismatch: 'TVA.ACCOMPLISHMENT.GOVERNANCE.SOURCE_TYPE_MISMATCH',
  governanceActorRequired: 'TVA.ACCOMPLISHMENT.GOVERNANCE.ACTOR_REQUIRED',
  relatedSuccessorRequired: 'TVA.ACCOMPLISHMENT.GOVERNANCE.RELATED_SUCCESSOR_REQUIRED',
  unexpectedRelatedAccomplishment:
    'TVA.ACCOMPLISHMENT.GOVERNANCE.UNEXPECTED_RELATED_ACCOMPLISHMENT',
} as const)

export type AccomplishmentGovernanceCode =
  | (typeof ACCOMPLISHMENT_GOVERNANCE_CODES)[keyof typeof ACCOMPLISHMENT_GOVERNANCE_CODES]
  | AccomplishmentLifecycleCode

export class GovernAccomplishmentLifecycleBlockedError extends BusinessLogicException {
  readonly blockerCodes: readonly AccomplishmentGovernanceCode[]

  constructor(blockerCodes: readonly AccomplishmentGovernanceCode[]) {
    super(blockerCodes[0] ?? 'TVA.ACCOMPLISHMENT.GOVERNANCE.BLOCKED', {
      reasonCodes: blockerCodes,
    })
    this.blockerCodes = blockerCodes
  }
}

function expectedSourceTypes(
  reasonCode: GovernAccomplishmentLifecycleInput['reasonCode']
): readonly GovernAccomplishmentLifecycleInput['sourceFact']['type'][] | null {
  switch (reasonCode) {
    case 'dispute_opened':
    case 'dispute_resolved':
      return ['dispute']
    case 'correction_issued':
      return ['correction']
    case 'superseded':
      return ['correction', 'governance']
    case 'governance_revoked':
      return ['governance']
    case 'publication_changed':
      return ['publication']
    case 'candidate_created':
    case 'review_started':
    case 'verification_completed':
    case 'partial_verification_completed':
      return null
  }
}

function requiresGovernanceActor(
  reasonCode: GovernAccomplishmentLifecycleInput['reasonCode']
): boolean {
  return [
    'dispute_resolved',
    'correction_issued',
    'superseded',
    'governance_revoked',
  ].includes(reasonCode)
}

export default class GovernAccomplishmentLifecycleCommand extends BaseCommand<
  GovernAccomplishmentLifecycleInput,
  PersistedAccomplishmentLifecycleTransition
> {
  constructor(private readonly writer: AccomplishmentLifecycleGovernanceWriter) {
    super()
  }

  async execute(
    input: GovernAccomplishmentLifecycleInput
  ): Promise<PersistedAccomplishmentLifecycleTransition> {
    const blockers = new Set<AccomplishmentGovernanceCode>()
    if (
      !Number.isSafeInteger(input.expectedLifecycleSequence) ||
      input.expectedLifecycleSequence < 1
    ) {
      blockers.add(ACCOMPLISHMENT_GOVERNANCE_CODES.invalidExpectedSequence)
    }

    const lifecycle = validateAccomplishmentLifecycleTransition({
      previousState: input.expectedLifecycleState,
      nextState: input.nextLifecycleState,
      previousVisibility: input.expectedVisibility,
      nextVisibility: input.nextVisibility,
      reasonCode: input.reasonCode,
    })
    for (const blocker of lifecycle.blockerCodes) blockers.add(blocker)

    const expectedTypes = expectedSourceTypes(input.reasonCode)
    if (expectedTypes && !expectedTypes.includes(input.sourceFact.type)) {
      blockers.add(ACCOMPLISHMENT_GOVERNANCE_CODES.sourceTypeMismatch)
    }
    if (requiresGovernanceActor(input.reasonCode) && input.actor.type !== 'governance') {
      blockers.add(ACCOMPLISHMENT_GOVERNANCE_CODES.governanceActorRequired)
    }
    if (input.nextLifecycleState === 'superseded' && input.relatedAccomplishmentId === null) {
      blockers.add(ACCOMPLISHMENT_GOVERNANCE_CODES.relatedSuccessorRequired)
    }
    if (input.nextLifecycleState !== 'superseded' && input.relatedAccomplishmentId !== null) {
      blockers.add(ACCOMPLISHMENT_GOVERNANCE_CODES.unexpectedRelatedAccomplishment)
    }

    if (blockers.size > 0) {
      throw new GovernAccomplishmentLifecycleBlockedError([...blockers].sort())
    }
    return this.writer.transition(input)
  }
}
