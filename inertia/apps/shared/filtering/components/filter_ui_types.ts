export type FilterFacetCountRelation = 'exact' | 'approximate' | 'unknown'

export interface FilterFacetValue {
  id: string
  label: string
  count: number | null
  countRelation: FilterFacetCountRelation
  selected: boolean
  retired?: boolean
}

export interface FilterHierarchyOption {
  id: string
  label: string
  depth: number
  retired?: boolean
}

export type FilterUiFieldType =
  | 'text'
  | 'scalar'
  | 'multi_value'
  | 'number'
  | 'date_time'
  | 'hierarchy'
  | 'boolean'
  | 'missing'

export interface FilterUiFieldDefinition {
  key: string
  label: string
  description?: string
  type: FilterUiFieldType
  operators: readonly string[]
  effects: readonly ('require' | 'exclude')[]
  defaultUnknown: 'include' | 'exclude'
  hierarchyOptions?: readonly FilterHierarchyOption[]
}

export interface FilterUiDraft {
  operator: string
  effect: 'require' | 'exclude'
  unknown: 'include' | 'exclude'
  scalar?: string
  selectedIds?: string[]
  minimumMatch?: number
  gte?: string
  lte?: string
  expansion?: 'exact' | 'ancestors' | 'descendants'
  missing?: boolean
}

export interface FilterUiFacetState {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'partial'
  values: readonly FilterFacetValue[]
  message?: string
}

export interface ActiveFilterChipValue {
  id: string
  label: string
}

export interface ActiveFilterChipModel {
  id: string
  fieldKey: string
  fieldLabel: string
  operator: string
  effect: 'require' | 'exclude'
  unknown: 'include' | 'exclude'
  values: readonly ActiveFilterChipValue[]
  minimumMatch?: number
  nestedDepth?: number
}

export type FilterExecutionState = 'idle' | 'loading' | 'error' | 'degraded' | 'partial'

export interface FilterResultTotal {
  value: number | null
  relation: 'exact' | 'gte' | 'unknown'
}
