export interface ApiV1Pagination {
  mode: 'offset' | 'cursor'
  page: number
  perPage: number
  total: number
  totalExact?: boolean
  totalRelation?: 'exact' | 'lower_bound'
  lastPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  nextCursor: string | null
  previousCursor: string | null
}
