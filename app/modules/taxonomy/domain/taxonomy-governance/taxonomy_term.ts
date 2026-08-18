import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type {
  FreeFormTag,
  FreeFormTagScope,
  TaxonomyTerm,
  TaxonomyTermRef,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_term_contracts'
import {
  canonicalTaxonomyRef,
  validateTaxonomyGraph,
  validateTaxonomyTerm,
} from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_term_contracts'

export * from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_term_contracts'

export function parseTaxonomyRef(value: string): TaxonomyTermRef | null {
  const parts = value.split(':')
  return parts.length === 2 && parts[0] && parts[1]
    ? { namespace: parts[0], termId: parts[1] }
    : null
}

export function selectTaxonomyTermLabel(
  term: TaxonomyTerm,
  locale: string,
  fallbackLocale: string
): { locale: string; value: string; usedFallback: boolean } {
  const normalized = locale.replaceAll('_', '-').toLowerCase()
  const fallback = fallbackLocale.replaceAll('_', '-').toLowerCase()
  const labelKeys = Object.keys(term.labels)
  const key =
    labelKeys.find((item) => item.toLowerCase() === normalized) ??
    labelKeys.find(
      (item) => item.toLowerCase().split('-')[0] === normalized.split('-')[0]
    ) ??
    labelKeys.find((item) => item.toLowerCase() === fallback) ??
    labelKeys[0]
  if (key === undefined) throw new ValidationException('Taxonomy term must have at least one label')
  const value = term.labels[key]
  if (value === undefined) throw new ValidationException('Taxonomy term label is missing')
  return { locale: key, value, usedFallback: key.toLowerCase() !== normalized }
}

export function normalizeTaxonomyMatchValue(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US')
}

export function normalizeFreeFormTag(value: string, scope: FreeFormTagScope): FreeFormTag {
  const displayValue = value.normalize('NFKC').trim().replace(/\s+/gu, ' ')
  return { ...scope, displayValue, normalizedValue: displayValue.toLocaleLowerCase('en-US') }
}

export function getTaxonomyReplacementDisposition(term: TaxonomyTerm):
  | { kind: 'deterministic'; replacement: TaxonomyTermRef }
  | { kind: 'requires_review'; replacements: readonly TaxonomyTermRef[] }
  | { kind: 'none' } {
  const replacements = term.replacementRefs ?? []
  if (replacements.length === 1) {
    const replacement = replacements[0]
    if (replacement !== undefined) return { kind: 'deterministic', replacement }
  }
  if (replacements.length > 1) return { kind: 'requires_review', replacements }
  return { kind: 'none' }
}

export { canonicalTaxonomyRef, validateTaxonomyGraph, validateTaxonomyTerm }
