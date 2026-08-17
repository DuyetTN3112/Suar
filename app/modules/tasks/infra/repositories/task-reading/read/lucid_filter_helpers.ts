import type { LucidModel, ModelQueryBuilderContract } from '@adonisjs/lucid/types/model'

const UUID_REGEX = /^[\da-f]{8}-[\da-f]{4}-[1-7][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i
const isValidId = (value: unknown): value is string =>
  typeof value === 'string' && UUID_REGEX.test(value)
type StandardFilterValue = string | string[] | null | undefined

export interface StandardFilters {
  search?: string
  searchFields?: string[] // fields to apply whereILike to
  created_at_start?: string
  created_at_end?: string
  due_date_start?: string
  due_date_end?: string
  [key: string]: StandardFilterValue
}

/** Applies generic filters to a Lucid query builder. */
export function applyStandardFilters<Model extends LucidModel>(
  query: ModelQueryBuilderContract<Model>,
  filters: StandardFilters,
  exactMatchKeys: string[] = []
): void {
  // Exact matches
  for (const key of exactMatchKeys) {
    const filterValue = filters[key]
    if (filterValue !== undefined && filterValue !== null) {
      if (Array.isArray(filterValue)) {
        if (filterValue.length > 0) {
          void query.whereIn(key, filterValue)
        }
      } else {
        void query.where(key, filterValue)
      }
    }
  }

  // Search
  if (filters.search && filters.searchFields && filters.searchFields.length > 0) {
    const searchTerm = filters.search
    const searchFields = filters.searchFields
    void query.where((searchQuery) => {
      for (const [index, field] of searchFields.entries()) {
        if (index === 0) {
          void searchQuery.whereILike(field, `%${searchTerm}%`)
        } else {
          void searchQuery.orWhereILike(field, `%${searchTerm}%`)
        }
      }

      if (isValidId(searchTerm)) {
        void searchQuery.orWhere('id', searchTerm)
      }
    })
  }

  // Date ranges
  if (filters.created_at_start) {
    void query.where('created_at', '>=', filters.created_at_start)
  }
  if (filters.created_at_end) {
    void query.where('created_at', '<=', filters.created_at_end)
  }
  if (filters.due_date_start) {
    void query.where('due_date', '>=', filters.due_date_start)
  }
  if (filters.due_date_end) {
    void query.where('due_date', '<=', filters.due_date_end)
  }
}
