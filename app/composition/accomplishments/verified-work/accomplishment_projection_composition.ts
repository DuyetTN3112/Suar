import ProjectVerifiedAccomplishmentCommand from '#modules/accomplishments/actions/commands/verified-work/project_verified_accomplishment_command'
import RebuildVerifiedAccomplishmentCommand from '#modules/accomplishments/actions/commands/verified-work/rebuild_verified_accomplishment_command'
import type { GovernedAccomplishmentProjectionSourceIdentity } from '#modules/accomplishments/actions/ports/outbound/verified-work/governed_accomplishment_projection_source_reader'
import { LucidAccomplishmentTransactionRunner } from '#modules/accomplishments/infra/adapters/verified-work/lucid_accomplishment_transaction_runner'
import LucidGovernedAccomplishmentProjectionSourceReader from '#modules/accomplishments/infra/adapters/verified-work/lucid_governed_accomplishment_projection_source_reader'
import { NodeAccomplishmentContentHasher } from '#modules/accomplishments/infra/adapters/verified-work/node_accomplishment_content_hasher'
import { verifiedAccomplishmentRepository } from '#modules/accomplishments/infra/repositories/verified-work/verified_accomplishment_repository'
import type { TvaSha256 } from '#modules/tasks/public_contracts/task-authoring/primitives'

const accomplishmentHasher = new NodeAccomplishmentContentHasher()
const accomplishmentTransactions = new LucidAccomplishmentTransactionRunner()

export const governedAccomplishmentProjectionSourceReader =
  new LucidGovernedAccomplishmentProjectionSourceReader()

/** Composition entry point for durable, idempotent native accomplishment projection. */
export function projectVerifiedAccomplishment(
  identity: GovernedAccomplishmentProjectionSourceIdentity
) {
  return new ProjectVerifiedAccomplishmentCommand({
    sources: governedAccomplishmentProjectionSourceReader,
    writer: verifiedAccomplishmentRepository,
    hasher: accomplishmentHasher,
    transactions: accomplishmentTransactions,
  }).execute(identity)
}

const rebuildVerifiedAccomplishmentCommand = new RebuildVerifiedAccomplishmentCommand({
  execute: projectVerifiedAccomplishment,
})

/** Rebuilds an immutable accomplishment from governed source facts and verifies its hash. */
export function rebuildVerifiedAccomplishment(
  identity: GovernedAccomplishmentProjectionSourceIdentity,
  expectedCanonicalHash?: TvaSha256
) {
  return rebuildVerifiedAccomplishmentCommand.execute(
    expectedCanonicalHash === undefined ? { identity } : { identity, expectedCanonicalHash }
  )
}

/**
 * Runs the same projector inside an already-open review transaction. The
 * composition root is the only place allowed to bridge the opaque bounded
 * context transaction handles; the projector itself remains application
 * contract driven and never opens a second transaction.
 */
export function projectVerifiedAccomplishmentInTransaction(
  identity: GovernedAccomplishmentProjectionSourceIdentity,
  transaction: object
) {
  return new ProjectVerifiedAccomplishmentCommand({
    sources: governedAccomplishmentProjectionSourceReader,
    writer: verifiedAccomplishmentRepository,
    hasher: accomplishmentHasher,
  }).execute(identity, transaction)
}
