import type {
  FilterExpression,
  FilterFieldType,
  FilterStrictEffect,
} from '#modules/filtering/public_contracts/filter_contracts'

export interface FilterPermissionFieldBinding {
  readonly field: string
  readonly type: FilterFieldType
  readonly operators: readonly string[]
  readonly effects: readonly FilterStrictEffect[]
}

export interface FilterPermissionConstraint {
  readonly expression?: FilterExpression
  readonly fieldBindings: readonly FilterPermissionFieldBinding[]
  readonly authorizationVersion: string
}
