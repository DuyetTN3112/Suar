import type {
  FilterValidationError,
} from '#modules/filtering/domain/filtering-core/filter_error'
import type { FilterFieldType } from '#modules/filtering/domain/filtering-core/filter_operators'

export interface FilterValidationLimits {
  maxDepth: number
  maxConditions: number
  maxSetValues: number
  maxTextLength: number
  maxRelationDepth: number
}

export const DEFAULT_FILTER_VALIDATION_LIMITS: Readonly<FilterValidationLimits> = {
  maxDepth: 5,
  maxConditions: 100,
  maxSetValues: 100,
  maxTextLength: 512,
  maxRelationDepth: 2,
}

export interface FilterAllowedField {
  type: FilterFieldType
  operators: readonly string[]
  relationFields?: Readonly<Record<string, FilterAllowedField>>
}

export interface FilterValidationOptions {
  limits?: Partial<FilterValidationLimits>
  allowedFields?: Readonly<Record<string, FilterAllowedField>>
}

export interface FilterPreferenceValidationOptions extends FilterValidationOptions {
  minWeight: number
  maxWeight: number
  maxPreferences?: number
}

export interface ValidationState {
  errors: FilterValidationError[]
  limits: FilterValidationLimits
  allowedFields?: Readonly<Record<string, FilterAllowedField>>
  conditions: number
  conditionLimitReported: boolean
}

export interface RuntimeFilterValue {
  kind?: unknown
  value?: unknown
  values?: unknown
  minimumMatch?: unknown
  gte?: unknown
  gt?: unknown
  lte?: unknown
  lt?: unknown
  amount?: unknown
  unit?: unknown
  anchor?: unknown
  termIds?: unknown
  expansion?: unknown
  count?: unknown
  expression?: unknown
}

export interface RuntimeFilterExpression {
  kind?: unknown
  field?: unknown
  operator?: unknown
  effect?: unknown
  unknown?: unknown
  value?: unknown
  combinator?: unknown
  negated?: unknown
  children?: unknown
}

export interface RuntimeFilterPreference {
  effect?: unknown
  expression?: unknown
  weight?: unknown
}

export const SAFE_UNSUPPORTED_REPAIR_HINT = 'Remove or replace the unsupported filter clause.'
