import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { TaxonomyConsumerImpact } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_change_criteria_mapping'

export interface TaxonomyMigrationPlanTokenGenerator {
  generate(canonical: string): string
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

export type TaxonomyMigrationImpact = TaxonomyConsumerImpact

export interface TaxonomyMigrationPreviewInput {
  namespace: string
  currentVersion: number
  expectedVersion: number
  changes: readonly TaxonomyMigrationChange[]
  impact: TaxonomyMigrationImpact
}

export type TaxonomyMigrationDisposition =
  | 'migrated'
  | 'deterministic'
  | 'blocked'
  | 'requires_repair'
  | 'compatible'

export interface TaxonomyMigrationMappingEntry {
  from: { namespace: string; termId: string }
  to?: { namespace: string; termId: string }
  replacements?: readonly { namespace: string; termId: string }[]
  disposition: TaxonomyMigrationDisposition
  reason: string
}

export interface TaxonomyMigrationPlan {
  planToken: string
  namespace: string
  fromVersion: number
  toVersion: number
  outcome: string
  mapping: readonly TaxonomyMigrationMappingEntry[]
  impact: TaxonomyMigrationImpact
}

export function canonicalRef(ref: { namespace: string; termId: string }): string {
  return `${ref.namespace}:${ref.termId}`
}

function mapChange(change: TaxonomyMigrationChange): TaxonomyMigrationMappingEntry {
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

function planOutcome(mapping: readonly TaxonomyMigrationMappingEntry[]): string {
  if (mapping.some(({ disposition }) => disposition === 'blocked')) return 'blocked'
  if (mapping.some(({ disposition }) => disposition === 'requires_repair')) return 'requires_repair'
  if (
    mapping.some(({ disposition }) => disposition === 'migrated' || disposition === 'deterministic')
  ) {
    return 'migrated'
  }
  return 'compatible'
}

export function previewTaxonomyChange(
  input: TaxonomyMigrationPreviewInput,
  tokenGenerator: TaxonomyMigrationPlanTokenGenerator
): TaxonomyMigrationPlan {
  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(input.namespace)) {
    throw new InvariantViolationException('invalid_taxonomy_namespace')
  }
  if (input.currentVersion !== input.expectedVersion) {
    throw new ConflictException('stale_taxonomy_migration_plan')
  }
  if (!Number.isSafeInteger(input.currentVersion) || input.currentVersion < 1) {
    throw new InvariantViolationException('invalid_taxonomy_version')
  }
  if (Object.values(input.impact).some((value) => !Number.isSafeInteger(value) || value < 0)) {
    throw new InvariantViolationException('invalid_taxonomy_impact')
  }
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
