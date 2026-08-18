// @ts-nocheck
var __defProp = Object.defineProperty
var __name = (target, value) => __defProp(target, 'name', { value, configurable: true })
function applyTaxonomyMigrationPlan(input) {
  if (
    input.currentVersion !== input.expectedVersion ||
    input.publishedVersion > input.currentVersion
  )
    throw new ConflictException('stale_taxonomy_migration_plan')
  if (!input.planToken || !Number.isSafeInteger(input.limit) || input.limit < 1)
    throw new InvariantViolationException('invalid_taxonomy_migration_apply')
  const known = new Set(input.items.map(({ id }) => id))
  const completed = new Set(input.completedIds.filter((id) => known.has(id)))
  const pending = input.items.filter(({ id }) => !completed.has(id)).slice(0, input.limit)
  for (const item of pending) completed.add(item.id)
  const completedIds = input.items.filter(({ id }) => completed.has(id)).map(({ id }) => id)
  const next = input.items.find(({ id }) => !completed.has(id))
  return {
    status: 'checkpoint',
    completedIds,
    nextCursor: next?.id ?? null,
    publishedVersion: input.publishedVersion,
  }
}
__name(applyTaxonomyMigrationPlan, 'applyTaxonomyMigrationPlan')
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
export { applyTaxonomyMigrationPlan }
export interface TaxonomyMigrationItem {
  id: string
  source: string
  target?: string
}

export interface TaxonomyMigrationCheckpoint {
  status: string
  completedIds: string[]
  nextCursor: string | null
  publishedVersion: number
}
