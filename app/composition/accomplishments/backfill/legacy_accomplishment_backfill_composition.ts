import { LegacyWorkHistoryReaderAdapter } from '#composition/adapters/cross-module/legacy_work_history_reader_adapter'
import {
  RunLegacyAccomplishmentBackfillCommand,
} from '#modules/accomplishments/actions/commands/legacy-backfill/run_legacy_accomplishment_backfill_command'
import type {
  LegacyAccomplishmentCutoverState,
  LegacyAccomplishmentRolloutFlags,
} from '#modules/accomplishments/domain/backfill/legacy_accomplishment_rollout_policy'
import { resolveLegacyAccomplishmentCutover } from '#modules/accomplishments/domain/backfill/legacy_accomplishment_rollout_policy'
import LucidLegacyAccomplishmentBackfillCheckpointStore, {
  LucidLegacyAccomplishmentBackfillWriter,
} from '#modules/accomplishments/infra/adapters/backfill/lucid_legacy_accomplishment_backfill_state'
import LucidLegacyAccomplishmentBackfillReader from '#modules/accomplishments/infra/adapters/legacy-backfill/lucid_legacy_accomplishment_backfill_reader'

const legacyBackfillCommand = new RunLegacyAccomplishmentBackfillCommand(
  new LucidLegacyAccomplishmentBackfillReader(new LegacyWorkHistoryReaderAdapter()),
  new LucidLegacyAccomplishmentBackfillCheckpointStore(),
  new LucidLegacyAccomplishmentBackfillWriter()
)

/** Runtime operator configuration; validation remains application/domain-owned. */
export function readLegacyAccomplishmentRolloutFlags(
  env: NodeJS.ProcessEnv = process.env
): LegacyAccomplishmentRolloutFlags {
  return {
    authoring: env['TVA_FLAG_AUTHORING'] === 'true',
    assignment: env['TVA_FLAG_ASSIGNMENT'] === 'true',
    completion: env['TVA_FLAG_COMPLETION'] === 'true',
    accomplishment: env['TVA_FLAG_ACCOMPLISHMENT'] === 'true',
    profile: env['TVA_FLAG_PROFILE'] === 'true',
    search: env['TVA_FLAG_SEARCH'] === 'true',
  }
}

export function readLegacyAccomplishmentCutoverState(
  env: NodeJS.ProcessEnv = process.env
): LegacyAccomplishmentCutoverState {
  const state = env['TVA_ACCOMPLISHMENT_CUTOVER']
  return state === 'dual_read' || state === 'new_only' || state === 'rollback'
    ? state
    : 'legacy_only'
}

export function readLegacyAccomplishmentCutoverDecision(
  env: NodeJS.ProcessEnv = process.env
) {
  return resolveLegacyAccomplishmentCutover(readLegacyAccomplishmentCutoverState(env))
}

/** Composition boundary for an operator/worker-triggered legacy backfill. */
export function runLegacyAccomplishmentBackfill(input: {
  readonly scopeKey: string
  readonly tenantUserIds: ReadonlySet<string> | null
  readonly limit: number
  readonly mode: 'dry_run' | 'apply'
}) {
  return legacyBackfillCommand.execute(input)
}
