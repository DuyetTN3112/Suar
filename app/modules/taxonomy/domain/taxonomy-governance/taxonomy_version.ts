import type { TaxonomyDiagnostic } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_diagnostics'
import type { TaxonomyTerm } from '#modules/taxonomy/public_contracts/taxonomy-governance/taxonomy_term_contracts'

export function validateTaxonomyTermTransition(previous: TaxonomyTerm, next: TaxonomyTerm): TaxonomyDiagnostic[] {
  const diagnostics: TaxonomyDiagnostic[] = []
  if (next.version <= previous.version) diagnostics.push({ code: 'version_not_advanced', severity: 'error', path: 'version', message: 'Version must advance' })
  if (previous.ref.namespace !== next.ref.namespace || previous.ref.termId !== next.ref.termId) diagnostics.push({ code: 'canonical_ref_changed', severity: 'error', path: 'ref', message: 'Canonical identity cannot change in place' })
  if ((previous.status === 'retired' || previous.status === 'merged') && next.status !== previous.status) diagnostics.push({ code: 'retired_identity_reused', severity: 'error', path: 'status', message: 'Terminal taxonomy identity cannot be reused' })
  return diagnostics
}
