import type { FilterContextDefinition } from './filter_contracts.js'

export interface FilterPrincipal {
  readonly kind: 'anonymous' | 'user' | 'service'
  readonly id?: string
  readonly organizationId?: string
  /** Server-resolved organization role; never accepted from query criteria. */
  readonly organizationRole?: string
  readonly authorizationVersion?: string
}

export interface FilterContextProvider {
  getEffectiveDefinition(input: {
    context: string
    principal: FilterPrincipal
  }): Promise<FilterContextDefinition>
}

export class FilterContextResolutionError extends Error {
  readonly code = 'FILTER_CONTEXT_UNAVAILABLE'

  constructor() {
    super('The filter context is unavailable.')
    this.name = 'FilterContextResolutionError'
  }
}
