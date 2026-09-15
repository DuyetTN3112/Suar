import type { FilterScalar } from '#modules/filtering/domain/filtering-core/filter_expression'

export type ReferenceSpecialValue =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'missing' }
  | { readonly kind: 'hidden' }
  | {
      readonly kind: 'hierarchy'
      readonly termIds: readonly string[]
      readonly ancestorIds: readonly string[]
    }
  | { readonly kind: 'relation'; readonly records: readonly ReferenceFilterRecord[] }

export type ReferenceFieldValue = FilterScalar | readonly FilterScalar[] | ReferenceSpecialValue

export interface ReferenceFilterRecord {
  readonly id: string
  readonly fields: Readonly<Record<string, ReferenceFieldValue>>
}
