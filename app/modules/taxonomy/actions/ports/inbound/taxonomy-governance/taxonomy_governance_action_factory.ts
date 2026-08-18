import type { TaxonomyGovernanceCommand } from '#modules/taxonomy/actions/commands/taxonomy-governance/taxonomy_governance_command'

/**
 * Inbound capability consumed by HTTP controllers.
 *
 * Composition owns the concrete command graph; the module boundary exposes
 * only the governance operations that an inbound adapter needs.
 */
export abstract class TaxonomyGovernanceActionFactory {
  abstract readonly governance: Pick<
    TaxonomyGovernanceCommand,
    | 'preview'
    | 'start'
    | 'status'
    | 'apply'
    | 'previewAndWrap'
    | 'previewAndStartAndWrap'
    | 'startAndWrap'
    | 'statusAndWrap'
    | 'applyAndWrap'
  >
}
