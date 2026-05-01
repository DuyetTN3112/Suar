export interface LegacyAccomplishmentRolloutFlags {
  readonly authoring: boolean
  readonly assignment: boolean
  readonly completion: boolean
  readonly accomplishment: boolean
  readonly profile: boolean
  readonly search: boolean
}

export interface LegacyAccomplishmentRolloutDecision {
  readonly allowed: boolean
  readonly blockers: readonly string[]
}

/**
 * Feature flags are an application rollout contract, not database state. The
 * dependency graph prevents a partial deployment from exposing an impossible
 * downstream read/write path.
 */
export function evaluateLegacyAccomplishmentRollout(
  flags: LegacyAccomplishmentRolloutFlags
): LegacyAccomplishmentRolloutDecision {
  const blockers: string[] = []
  const assignmentReady = flags.assignment && flags.authoring
  const completionReady = flags.completion && assignmentReady
  const accomplishmentReady = flags.accomplishment && completionReady
  if (flags.assignment && !flags.authoring) blockers.push('assignment_requires_authoring')
  if (flags.completion && !assignmentReady) blockers.push('completion_requires_assignment')
  if (flags.accomplishment && !completionReady) blockers.push('accomplishment_requires_completion')
  if (flags.search && !accomplishmentReady) blockers.push('search_requires_accomplishment')
  return { allowed: blockers.length === 0, blockers }
}

export type LegacyAccomplishmentCutoverState =
  | 'legacy_only'
  | 'dual_read'
  | 'new_only'
  | 'rollback'

export interface LegacyAccomplishmentCutoverDecision {
  readonly allowLegacyRead: boolean
  readonly allowNewRead: boolean
  readonly allowNewWrite: boolean
}

/** Rollback disables new reads/writes without deleting immutable facts. */
export function resolveLegacyAccomplishmentCutover(
  state: LegacyAccomplishmentCutoverState
): LegacyAccomplishmentCutoverDecision {
  switch (state) {
    case 'legacy_only':
      return { allowLegacyRead: true, allowNewRead: false, allowNewWrite: false }
    case 'dual_read':
      return { allowLegacyRead: true, allowNewRead: true, allowNewWrite: true }
    case 'new_only':
      return { allowLegacyRead: false, allowNewRead: true, allowNewWrite: true }
    case 'rollback':
      return { allowLegacyRead: true, allowNewRead: false, allowNewWrite: false }
  }
}
