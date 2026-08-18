import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validationIssue } from '#modules/errors/public_contracts/validation_issue'
import type { TaxonomyMigrationItem } from '#modules/taxonomy/domain/taxonomy-governance/taxonomy_change_set'
import type { TaxonomyChange } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_change_criteria_mapping'

const CHANGE_KINDS = new Set(['rename', 'alias_add', 'alias_remove', 'merge', 'retire', 'reparent', 'split'])

function object(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid(field, `${field} must be an object`)
  return value as Record<string, unknown>
}

function invalid(field: string, message: string): never {
  throw ValidationException.fromIssues([validationIssue(field, message, 'REQUEST_FIELD_INVALID')])
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) invalid(field, `${field} is required`)
  return value.trim()
}

function positiveInt(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) invalid(field, `${field} must be a positive integer`)
  return value
}

function reference(value: unknown, field: string) {
  const input = object(value, field)
  return { namespace: requiredString(input['namespace'], `${field}.namespace`), termId: requiredString(input['termId'], `${field}.termId`) }
}

function mapChanges(value: unknown): readonly TaxonomyChange[] {
  if (!Array.isArray(value) || value.length > 100) invalid('changes', 'changes must be an array with at most 100 items')
  return value.map((entry, index) => {
    const field = `changes.${index}`
    const input = object(entry, field)
    const kind = requiredString(input['kind'], `${field}.kind`)
    if (!CHANGE_KINDS.has(kind)) invalid(`${field}.kind`, 'Unsupported taxonomy change kind')
    const from = reference(input['from'], `${field}.from`)
    if (kind === 'alias_add' || kind === 'alias_remove') return { kind, from, value: requiredString(input['value'], `${field}.value`) }
    if (kind === 'retire') return { kind, from }
    if (kind === 'rename' || kind === 'merge') return { kind, from, to: reference(input['to'], `${field}.to`) }
    if (kind === 'reparent') {
      if (!Array.isArray(input['parents'])) invalid(`${field}.parents`, `${field}.parents must be an array`)
      return { kind, from, parents: input['parents'].map((parent, i) => reference(parent, `${field}.parents.${i}`)) }
    }
    if (!Array.isArray(input['replacements'])) invalid(`${field}.replacements`, `${field}.replacements must be an array`)
    return { kind, from, replacements: input['replacements'].map((replacement, i) => reference(replacement, `${field}.replacements.${i}`)) }
  }) as readonly TaxonomyChange[]
}

export interface TaxonomyGovernancePreviewRequest {
  readonly namespace: string
  readonly expectedVersion: number
  readonly changes: readonly TaxonomyChange[]
}

export function buildTaxonomyGovernancePreviewRequest(body: unknown): TaxonomyGovernancePreviewRequest {
  const input = object(body, 'body')
  return {
    namespace: requiredString(input['namespace'], 'namespace'),
    expectedVersion: positiveInt(input['expectedVersion'], 'expectedVersion'),
    changes: mapChanges(input['changes']),
  }
}

export interface TaxonomyGovernanceApplyRequest {
  readonly planToken: string
  readonly expectedLockVersion: number
  readonly publishedVersion: number
  readonly items: readonly TaxonomyMigrationItem[]
  readonly limit: number
}

export function buildTaxonomyGovernanceApplyRequest(params: unknown, body: unknown): TaxonomyGovernanceApplyRequest {
  const route = object(params, 'params')
  const input = object(body, 'body')
  const itemsValue = input['items']
  if (!Array.isArray(itemsValue) || itemsValue.length > 1_000) invalid('items', 'items must be an array with at most 1000 items')
  return {
    planToken: requiredString(route['planToken'], 'planToken'),
    expectedLockVersion: positiveInt(input['expectedLockVersion'], 'expectedLockVersion'),
    publishedVersion: positiveInt(input['publishedVersion'], 'publishedVersion'),
    items: itemsValue.map((item, index) => {
      const value = object(item, `items.${index}`)
      return { id: requiredString(value['id'], `items.${index}.id`), source: requiredString(value['source'], `items.${index}.source`), ...(value['target'] === undefined ? {} : { target: requiredString(value['target'], `items.${index}.target`) }) }
    }),
    limit: positiveInt(input['limit'], 'limit'),
  }
}

export function buildTaxonomyGovernanceStatusRequest(params: unknown): { readonly planToken: string } {
  const route = object(params, 'params')
  return { planToken: requiredString(route['planToken'], 'planToken') }
}
