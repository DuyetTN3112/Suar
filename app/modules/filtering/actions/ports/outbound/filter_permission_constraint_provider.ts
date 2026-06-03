import type { FilterPrincipal } from '#modules/filtering/public_contracts/filter_context_provider'
import type { FilterPermissionConstraint } from '#modules/filtering/public_contracts/filter_permission_constraint'
export type {
  FilterPermissionConstraint,
  FilterPermissionFieldBinding,
} from '#modules/filtering/public_contracts/filter_permission_constraint'

export interface FilterPermissionConstraintProvider {
  buildMandatoryExpression(input: {
    context: string
    principal: FilterPrincipal
  }): Promise<FilterPermissionConstraint>
}
