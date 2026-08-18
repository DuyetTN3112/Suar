import type { TaxonomyDiagnostic } from './taxonomy_diagnostics.js'

export const TAXONOMY_TERM_STATUSES = ['active', 'deprecated', 'retired', 'merged'] as const
export type TaxonomyTermStatus = (typeof TAXONOMY_TERM_STATUSES)[number]

export const TAXONOMY_ALIAS_KINDS = [
  'synonym',
  'abbreviation',
  'spelling',
  'translation',
  'legacy',
] as const
export type TaxonomyAliasKind = (typeof TAXONOMY_ALIAS_KINDS)[number]

export const TAXONOMY_ALIAS_REVIEW_STATES = ['reviewed', 'suggested'] as const
export type TaxonomyAliasReviewState = (typeof TAXONOMY_ALIAS_REVIEW_STATES)[number]

export interface TaxonomyTermRef {
  readonly namespace: string
  readonly termId: string
}

export interface TaxonomyAlias {
  readonly locale?: string
  readonly value: string
  readonly kind: TaxonomyAliasKind
  readonly reviewState: TaxonomyAliasReviewState
}

export interface TaxonomyTerm {
  readonly ref: TaxonomyTermRef
  readonly version: number
  readonly status: TaxonomyTermStatus
  readonly labels: Readonly<Record<string, string>>
  readonly aliases: readonly TaxonomyAlias[]
  readonly parentRefs: readonly TaxonomyTermRef[]
  readonly replacementRefs?: readonly TaxonomyTermRef[]
  readonly metadata?: Readonly<Record<string, string | number | boolean>>
}

export interface LocalizedTaxonomyLabel {
  readonly locale: string
  readonly value: string
  readonly usedFallback: boolean
}

export interface FreeFormTagScope {
  readonly resource: string
  readonly entityId: string
  readonly tagSpace: string
  readonly sourceType: string
  readonly sourceId?: string
}

export interface FreeFormTag extends FreeFormTagScope {
  readonly displayValue: string
  readonly normalizedValue: string
}

export const ASSIGNMENT_PROVENANCE_VALUES = [
  'explicit',
  'imported',
  'derived',
  'suggested',
] as const
export type AssignmentProvenance = (typeof ASSIGNMENT_PROVENANCE_VALUES)[number]

export const ASSIGNMENT_REVIEW_STATES = [
  'reviewed',
  'pending',
  'disputed',
  'rejected',
  'expired',
] as const
export type AssignmentReviewState = (typeof ASSIGNMENT_REVIEW_STATES)[number]

export interface EntityTaxonomyAssignment {
  readonly resource: string
  readonly entityId: string
  readonly term: TaxonomyTermRef
  readonly provenance: AssignmentProvenance
  readonly reviewState: AssignmentReviewState
  readonly confidence?: number
  readonly sourceType: string
  readonly sourceId?: string
  readonly evidenceRefs?: readonly string[]
  readonly validFrom?: string
  readonly validUntil?: string
  readonly taxonomyVersion: number
  readonly enrichmentVersion?: number
}

export class TaxonomyGraphError extends Error {
  readonly diagnostics: readonly TaxonomyDiagnostic[]

  constructor(diagnostics: readonly TaxonomyDiagnostic[]) {
    super('Taxonomy graph is not publishable')
    this.name = 'TaxonomyGraphError'
    this.diagnostics = diagnostics
  }
}

export function canonicalTaxonomyRef(ref: TaxonomyTermRef): string {
  return `${ref.namespace}:${ref.termId}`
}

export function validateTaxonomyTermRef(ref: unknown, path = 'ref'): TaxonomyDiagnostic[] {
  const diagnostics: TaxonomyDiagnostic[] = []
  if (ref === null || typeof ref !== 'object' || Array.isArray(ref)) {
    diagnostics.push(
      diagnostic('invalid_term_id', path, 'Canonical term reference must be an object')
    )
    return diagnostics
  }
  const candidate = ref as Record<string, unknown>
  validateRef(
    {
      namespace: typeof candidate['namespace'] === 'string' ? candidate['namespace'] : '',
      termId: typeof candidate['termId'] === 'string' ? candidate['termId'] : '',
    },
    path,
    diagnostics
  )
  return diagnostics
}

function isTaxonomyTermRef(ref: unknown): ref is TaxonomyTermRef {
  return (
    ref !== null &&
    typeof ref === 'object' &&
    !Array.isArray(ref) &&
    typeof (ref as Record<string, unknown>)['namespace'] === 'string' &&
    typeof (ref as Record<string, unknown>)['termId'] === 'string'
  )
}

function validateRef(ref: TaxonomyTermRef, path: string, diagnostics: TaxonomyDiagnostic[]): void {
  if (!/^[a-z0-9][a-z0-9._-]*$/u.test(ref.namespace)) {
    diagnostics.push(
      diagnostic(
        'invalid_namespace',
        `${path}.namespace`,
        'Namespace must be a stable lowercase key'
      )
    )
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(ref.termId)) {
    diagnostics.push(
      diagnostic('invalid_term_id', `${path}.termId`, 'Term ID must be a stable non-empty key')
    )
  }
}

function validateUniqueRefs(
  refs: readonly TaxonomyTermRef[],
  path: string,
  diagnostics: TaxonomyDiagnostic[]
): void {
  const seen = new Set<string>()
  for (const [index, ref] of refs.entries()) {
    if (!isTaxonomyTermRef(ref)) {
      continue
    }
    const key = canonicalTaxonomyRef(ref)
    if (seen.has(key)) {
      diagnostics.push(diagnostic('duplicate_ref', `${path}.${index}`, 'Duplicate reference'))
    }
    seen.add(key)
  }
}

function normalizeLocale(locale: string): string {
  return locale.trim().replaceAll('_', '-').toLocaleLowerCase('en-US')
}

function normalizeTaxonomyMatchValue(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US')
}

function normalizedAliasKey(value: string, locale = ''): string {
  const normalizedLocale =
    locale.trim().replaceAll('_', '-').split('-')[0]?.toLocaleLowerCase('en-US') ?? ''
  return `${normalizedLocale}:${normalizeTaxonomyMatchValue(value)}`
}

function diagnostic(
  code: TaxonomyDiagnostic['code'],
  path: string,
  message: string
): TaxonomyDiagnostic {
  return { code, severity: 'error', path, message }
}

export function validateTaxonomyTerm(term: TaxonomyTerm): TaxonomyDiagnostic[] {
  const diagnostics: TaxonomyDiagnostic[] = []
  diagnostics.push(...validateTaxonomyTermRef(term.ref, 'ref'))
  const ownRef = isTaxonomyTermRef(term.ref) ? term.ref : null

  if (!TAXONOMY_TERM_STATUSES.includes(term.status)) {
    diagnostics.push(
      diagnostic('invalid_term_status', 'status', 'Use a supported taxonomy lifecycle status')
    )
  }

  if (!Number.isSafeInteger(term.version) || term.version < 1) {
    diagnostics.push(diagnostic('invalid_version', 'version', 'Version must be a positive integer'))
  }
  if (Object.keys(term.labels).length === 0) {
    diagnostics.push(
      diagnostic('missing_label', 'labels', 'At least one localized label is required')
    )
  }
  const labelLocaleKeys = new Set<string>()
  for (const [locale, label] of Object.entries(term.labels)) {
    const localeKey = normalizeLocale(locale)
    if (labelLocaleKeys.has(localeKey)) {
      diagnostics.push(
        diagnostic(
          'locale_collision',
          `labels.${locale}`,
          'Localized label keys must be unique after locale normalization'
        )
      )
    }
    labelLocaleKeys.add(localeKey)
    if (locale.trim().length === 0 || label.trim().length === 0) {
      diagnostics.push(
        diagnostic('invalid_label', `labels.${locale}`, 'Label locale and value must be non-empty')
      )
    }
  }

  const aliasKeys = new Set<string>()
  for (const [index, alias] of term.aliases.entries()) {
    if (!TAXONOMY_ALIAS_KINDS.includes(alias.kind)) {
      diagnostics.push(
        diagnostic('invalid_alias_kind', `aliases.${index}.kind`, 'Use a supported alias kind')
      )
    }
    if (!TAXONOMY_ALIAS_REVIEW_STATES.includes(alias.reviewState)) {
      diagnostics.push(
        diagnostic(
          'invalid_alias_review_state',
          `aliases.${index}.reviewState`,
          'Use reviewed or suggested alias state'
        )
      )
    }
    if (alias.value.trim().length === 0) {
      diagnostics.push(
        diagnostic('invalid_alias', `aliases.${index}.value`, 'Alias value must be non-empty')
      )
      continue
    }
    const key = normalizedAliasKey(alias.value, alias.locale)
    if (aliasKeys.has(key)) {
      diagnostics.push(
        diagnostic(
          'alias_collision',
          `aliases.${index}`,
          'Aliases that normalize to the same locale and value are ambiguous'
        )
      )
    }
    aliasKeys.add(key)
  }

  validateUniqueRefs(term.parentRefs, 'parentRefs', diagnostics)
  validateUniqueRefs(term.replacementRefs ?? [], 'replacementRefs', diagnostics)
  for (const [index, parent] of term.parentRefs.entries()) {
    diagnostics.push(...validateTaxonomyTermRef(parent, `parentRefs.${index}`))
    if (isTaxonomyTermRef(parent) && ownRef && parent.namespace !== ownRef.namespace) {
      diagnostics.push(
        diagnostic(
          'cross_namespace_parent',
          `parentRefs.${index}`,
          'Hierarchy parents must belong to the same namespace'
        )
      )
    }
  }
  for (const [index, replacement] of (term.replacementRefs ?? []).entries()) {
    diagnostics.push(...validateTaxonomyTermRef(replacement, `replacementRefs.${index}`))
    if (isTaxonomyTermRef(replacement) && ownRef && replacement.namespace !== ownRef.namespace) {
      diagnostics.push(
        diagnostic(
          'cross_namespace_replacement',
          `replacementRefs.${index}`,
          'Replacement terms must belong to the same namespace'
        )
      )
    }
    if (
      isTaxonomyTermRef(replacement) &&
      ownRef &&
      canonicalTaxonomyRef(replacement) === canonicalTaxonomyRef(ownRef)
    ) {
      diagnostics.push(
        diagnostic('self_replacement', `replacementRefs.${index}`, 'A term cannot replace itself')
      )
    }
  }

  if (term.status === 'active' && (term.replacementRefs?.length ?? 0) > 0) {
    diagnostics.push(
      diagnostic('active_term_has_replacement', 'replacementRefs', 'Active terms cannot redirect')
    )
  }
  if (term.status === 'merged' && term.replacementRefs?.length !== 1) {
    diagnostics.push(
      diagnostic(
        'invalid_merge_replacement',
        'replacementRefs',
        'Merged terms require exactly one deterministic replacement'
      )
    )
  }

  return diagnostics
}

export function validateTaxonomyGraph(terms: readonly TaxonomyTerm[]): TaxonomyDiagnostic[] {
  const diagnostics = terms.flatMap(validateTaxonomyTerm)
  const byRef = new Map(terms.map((term) => [canonicalTaxonomyRef(term.ref), term]))
  const aliasOwners = new Map<string, string>()
  const termOwners = new Set<string>()

  for (const term of terms) {
    const termKey = canonicalTaxonomyRef(term.ref)
    if (termOwners.has(termKey)) {
      diagnostics.push(
        diagnostic(
          'duplicate_term_ref',
          termKey,
          'A canonical term reference may occur only once in a taxonomy version'
        )
      )
    }
    termOwners.add(termKey)
    for (const [index, parent] of term.parentRefs.entries()) {
      if (!byRef.has(canonicalTaxonomyRef(parent))) {
        diagnostics.push(
          diagnostic(
            'orphan_parent',
            `${termKey}.parentRefs.${index}`,
            'Parent reference does not exist in this graph version'
          )
        )
      }
    }
    for (const [index, replacement] of (term.replacementRefs ?? []).entries()) {
      const replacementTerm = byRef.get(canonicalTaxonomyRef(replacement))
      if (!replacementTerm) {
        diagnostics.push(
          diagnostic(
            'orphan_replacement',
            `${termKey}.replacementRefs.${index}`,
            'Replacement reference does not exist in this graph version'
          )
        )
      } else if (replacementTerm.status === 'retired' || replacementTerm.status === 'merged') {
        diagnostics.push(
          diagnostic(
            'invalid_replacement_target',
            `${termKey}.replacementRefs.${index}`,
            'Replacement target must remain active or deprecated'
          )
        )
      }
    }
    for (const [index, alias] of term.aliases.entries()) {
      const key = `${term.ref.namespace}:${normalizedAliasKey(alias.value, alias.locale)}`
      const previousOwner = aliasOwners.get(key)
      if (previousOwner && previousOwner !== termKey) {
        diagnostics.push(
          diagnostic(
            'ambiguous_alias',
            `${termKey}.aliases.${index}`,
            'Alias resolves to more than one canonical term'
          )
        )
      } else {
        aliasOwners.set(key, termKey)
      }
    }
  }

  const visiting = new Set<string>()
  const visited = new Set<string>()
  const cycleKeys = new Set<string>()
  const visit = (key: string, path: readonly string[]) => {
    if (visiting.has(key)) {
      const cycleStart = path.indexOf(key)
      const cycle = [...path.slice(cycleStart), key]
      const stableCycle = [...new Set(cycle)].sort().join('|')
      if (!cycleKeys.has(stableCycle)) {
        cycleKeys.add(stableCycle)
        diagnostics.push(
          diagnostic('graph_cycle', key, `Hierarchy cycle detected: ${cycle.join(' -> ')}`)
        )
      }
      return
    }
    if (visited.has(key)) {
      return
    }
    const term = byRef.get(key)
    if (!term) {
      return
    }
    visiting.add(key)
    for (const parent of term.parentRefs) {
      visit(canonicalTaxonomyRef(parent), [...path, key])
    }
    visiting.delete(key)
    visited.add(key)
  }

  for (const key of byRef.keys()) {
    visit(key, [])
  }
  return diagnostics
}

export function buildTaxonomyAncestorPaths(
  terms: readonly TaxonomyTerm[],
  refs: readonly TaxonomyTermRef[]
): TaxonomyTermRef[][] {
  const diagnostics = validateTaxonomyGraph(terms).filter(({ code }) =>
    [
      'cross_namespace_replacement',
      'duplicate_term_ref',
      'graph_cycle',
      'invalid_replacement_target',
      'orphan_parent',
      'orphan_replacement',
      'self_replacement',
    ].includes(code)
  )
  if (diagnostics.length > 0) {
    throw new TaxonomyGraphError(diagnostics)
  }
  const byRef = new Map(terms.map((term) => [canonicalTaxonomyRef(term.ref), term]))
  const paths: TaxonomyTermRef[][] = []

  const collect = (ref: TaxonomyTermRef, path: readonly TaxonomyTermRef[]) => {
    const term = byRef.get(canonicalTaxonomyRef(ref))
    if (!term) {
      return
    }
    const nextPath = [...path, term.ref]
    if (term.parentRefs.length === 0) {
      paths.push(nextPath)
      return
    }
    for (const parent of term.parentRefs) {
      collect(parent, nextPath)
    }
  }
  for (const ref of refs) {
    collect(ref, [])
  }
  return paths
}
