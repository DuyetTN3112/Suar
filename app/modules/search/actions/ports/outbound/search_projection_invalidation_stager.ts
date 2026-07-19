import type { SearchProjectionInvalidation } from '#modules/search/public_contracts/search_projection_invalidation'

export interface SearchProjectionInvalidationStager {
  stage(transaction: object, input: SearchProjectionInvalidation): Promise<{ readonly id: string; readonly staged: boolean }>
}
