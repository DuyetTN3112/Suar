import type { ApplicationService } from '@adonisjs/core/types'

import { taxonomyGovernanceActionFactory } from './taxonomy_governance_composition.js'

import { TaxonomyGovernanceActionFactory } from '#modules/taxonomy/actions/ports/inbound/taxonomy-governance/taxonomy_governance_action_factory'

export default class TaxonomyGovernanceApplicationProvider {
  constructor(private readonly app: ApplicationService) {}

  register(): void {
    this.app.container.singleton(
      TaxonomyGovernanceActionFactory,
      () => taxonomyGovernanceActionFactory
    )
  }
}
