import { BaseCommand } from '#modules/accomplishments/actions/base_command'
import type {
  GovernedAccomplishmentProjectionSourceIdentity,
} from '#modules/accomplishments/actions/ports/outbound/verified-work/governed_accomplishment_projection_source_reader'
import type { PersistedVerifiedAccomplishmentResult } from '#modules/accomplishments/actions/ports/outbound/verified-work/verified_accomplishment_writer'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'
import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'

export const REBUILD_VERIFIED_ACCOMPLISHMENT_CODES = Object.freeze({
  canonicalHashMismatch: 'TVA.ACCOMPLISHMENT.REBUILD.CANONICAL_HASH_MISMATCH',
} as const)

export class RebuildVerifiedAccomplishmentHashMismatchError extends BusinessLogicException {
  constructor(expectedCanonicalHash: TvaSha256, actualCanonicalHash: TvaSha256) {
    super(REBUILD_VERIFIED_ACCOMPLISHMENT_CODES.canonicalHashMismatch, {
      reasonCodes: [REBUILD_VERIFIED_ACCOMPLISHMENT_CODES.canonicalHashMismatch],
      meta: { expectedCanonicalHash, actualCanonicalHash },
    })
  }
}

export interface RebuildVerifiedAccomplishmentProjector {
  execute(
    identity: GovernedAccomplishmentProjectionSourceIdentity
  ): Promise<PersistedVerifiedAccomplishmentResult>
}

export interface RebuildVerifiedAccomplishmentInput {
  readonly identity: GovernedAccomplishmentProjectionSourceIdentity
  readonly expectedCanonicalHash?: TvaSha256
}

export interface RebuildVerifiedAccomplishmentResult
  extends PersistedVerifiedAccomplishmentResult {
  readonly rebuilt: true
  readonly canonicalHashMatchesExpected: boolean
}

/**
 * Operational rebuild hook. The governed projector reloads immutable source facts and
 * idempotently recreates/validates the canonical aggregate; an optional expected hash
 * turns source/projection drift into a fail-closed result instead of silent repair.
 */
export default class RebuildVerifiedAccomplishmentCommand extends BaseCommand<
  RebuildVerifiedAccomplishmentInput,
  RebuildVerifiedAccomplishmentResult
> {
  constructor(private readonly projector: RebuildVerifiedAccomplishmentProjector) {
    super()
  }

  async execute(
    input: RebuildVerifiedAccomplishmentInput
  ): Promise<RebuildVerifiedAccomplishmentResult> {
    const result = await this.projector.execute(input.identity)
    const expectedCanonicalHash = input.expectedCanonicalHash
    const canonicalHashMatchesExpected =
      expectedCanonicalHash === undefined || expectedCanonicalHash === result.canonicalHash

    if (!canonicalHashMatchesExpected) {
      throw new RebuildVerifiedAccomplishmentHashMismatchError(
        expectedCanonicalHash,
        result.canonicalHash
      )
    }

    return {
      ...result,
      rebuilt: true,
      canonicalHashMatchesExpected,
    }
  }
}
