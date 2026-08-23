// @ts-nocheck
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
function previewTaxonomyChange(input, tokenGenerator) {
  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(input.namespace))
    throw new InvariantViolationException('invalid_taxonomy_namespace')
  if (input.currentVersion !== input.expectedVersion)
    throw new ConflictException('stale_taxonomy_migration_plan')
  if (!Number.isSafeInteger(input.currentVersion) || input.currentVersion < 1)
    throw new InvariantViolationException('invalid_taxonomy_version')
  if (Object.values(input.impact).some((value) => !Number.isSafeInteger(value) || value < 0))
    throw new InvariantViolationException('invalid_taxonomy_impact')
  const mapping = input.changes.map(mapChange)
  const outcome = planOutcome(mapping)
  const canonical = JSON.stringify({
    namespace: input.namespace,
    fromVersion: input.currentVersion,
    toVersion: input.currentVersion + 1,
    changes: input.changes,
    impact: input.impact,
  })
  return {
    planToken: tokenGenerator.generate(canonical),
    namespace: input.namespace,
    fromVersion: input.currentVersion,
    toVersion: input.currentVersion + 1,
    outcome,
    mapping,
    impact: input.impact,
  }
}
__name(previewTaxonomyChange, 'previewTaxonomyChange')
function mapChange(change) {
  switch (change.kind) {
    case 'rename':
      return {
        from: change.from,
        to: change.to,
        disposition: 'migrated',
        reason: 'identity_preserving_rename',
      }
    case 'merge':
      return {
        from: change.from,
        to: change.to,
        disposition: 'deterministic',
        reason: 'unambiguous_merge',
      }
    case 'split':
      return change.replacements.length === 0
        ? { from: change.from, disposition: 'blocked', reason: 'split_without_replacement' }
        : {
            from: change.from,
            replacements: change.replacements,
            disposition: 'requires_repair',
            reason: 'ambiguous_split',
          }
    case 'retire':
      return {
        from: change.from,
        disposition: 'blocked',
        reason: 'retirement_requires_consumer_repair',
      }
    case 'alias_add':
      return { from: change.from, disposition: 'compatible', reason: 'alias_added' }
    case 'alias_remove':
      return { from: change.from, disposition: 'compatible', reason: 'alias_removed' }
    case 'reparent':
      return { from: change.from, disposition: 'migrated', reason: 'hierarchy_reparented' }
  }
}
__name(mapChange, 'mapChange')
function planOutcome(mapping) {
  if (mapping.some(({ disposition }) => disposition === 'blocked')) return 'blocked'
  if (mapping.some(({ disposition }) => disposition === 'requires_repair')) return 'requires_repair'
  if (
    mapping.some(({ disposition }) => disposition === 'migrated' || disposition === 'deterministic')
  )
    return 'migrated'
  return 'compatible'
}
__name(planOutcome, 'planOutcome')
function canonicalRef(ref) {
  return `${ref.namespace}:${ref.termId}`
}
__name(canonicalRef, 'canonicalRef')
export { canonicalRef, previewTaxonomyChange }
export interface TaxonomyMigrationPlanTokenGenerator {
  generate(canonical: string): string
}

export interface TaxonomyMigrationPreviewInput {
  namespace: string
  currentVersion: number
  expectedVersion: number
  changes: readonly TaxonomyMigrationChange[]
  impact: {
    assignments: number
    savedViews: number
    alerts: number
    projections: number
    indices: number
  }
}

export type TaxonomyMigrationChange =
  | {
      kind: 'rename' | 'merge'
      from: { namespace: string; termId: string }
      to: { namespace: string; termId: string }
    }
  | {
      kind: 'reparent'
      from: { namespace: string; termId: string }
      parents: readonly { namespace: string; termId: string }[]
    }
  | {
      kind: 'split'
      from: { namespace: string; termId: string }
      replacements: readonly { namespace: string; termId: string }[]
    }
  | { kind: 'retire' | 'alias_add' | 'alias_remove'; from: { namespace: string; termId: string } }

export interface TaxonomyMigrationPlan {
  planToken: string
  namespace: string
  fromVersion: number
  toVersion: number
  outcome: string
  mapping: readonly Record<string, unknown>[]
  impact: {
    assignments: number
    savedViews: number
    alerts: number
    projections: number
    indices: number
  }
}
