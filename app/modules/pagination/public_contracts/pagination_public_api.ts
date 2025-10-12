export type {
  CanonicalApiPagination,
  CanonicalCursorMetaLike,
  CanonicalMetaLike,
  CanonicalPageCursor,
  CanonicalPagePagination,
  LegacySnakeCursorMetaLike,
  LegacySnakeMetaLike,
} from './pagination_boundary.js'
export type {
  CursorPage,
  NormalizedPagination,
  PaginationDefaults,
  PaginationInput,
  PaginationMeta,
  PaginationPolicy,
  StrictPaginationErrors,
  TimestampCursorPayload,
} from './pagination.js'

export {
  buildPaginationMeta,
  decodeTimestampCursor,
  definePaginationPolicy,
  encodeTimestampCursor,
  normalizePagination,
  normalizeStrictPagination,
  slicePageItems,
  toLastPage,
  toOffset,
  toPageNumber,
  toPerPageNumber,
  toWindowLimit,
} from './pagination.js'
export {
  fromLegacySnakePagination,
  normalizeLegacySnakePagination,
  toCanonicalApiPagination,
  toCanonicalPagePagination,
} from './pagination_boundary.js'

import {
  buildPaginationMeta,
  decodeTimestampCursor,
  definePaginationPolicy,
  encodeTimestampCursor,
  normalizePagination,
  normalizeStrictPagination,
  slicePageItems,
  toLastPage,
  toOffset,
  toPageNumber,
  toPerPageNumber,
  toWindowLimit,
} from './pagination.js'
import {
  fromLegacySnakePagination,
  normalizeLegacySnakePagination,
  toCanonicalApiPagination,
  toCanonicalPagePagination,
} from './pagination_boundary.js'

export interface PaginationPort {
  buildPaginationMeta: typeof buildPaginationMeta
  decodeTimestampCursor: typeof decodeTimestampCursor
  definePaginationPolicy: typeof definePaginationPolicy
  encodeTimestampCursor: typeof encodeTimestampCursor
  fromLegacySnakePagination: typeof fromLegacySnakePagination
  normalizeLegacySnakePagination: typeof normalizeLegacySnakePagination
  normalizePagination: typeof normalizePagination
  normalizeStrictPagination: typeof normalizeStrictPagination
  slicePageItems: typeof slicePageItems
  toCanonicalApiPagination: typeof toCanonicalApiPagination
  toCanonicalPagePagination: typeof toCanonicalPagePagination
  toLastPage: typeof toLastPage
  toOffset: typeof toOffset
  toPageNumber: typeof toPageNumber
  toPerPageNumber: typeof toPerPageNumber
  toWindowLimit: typeof toWindowLimit
}

export const paginationPublicApi: PaginationPort = {
  buildPaginationMeta,
  decodeTimestampCursor,
  definePaginationPolicy,
  encodeTimestampCursor,
  fromLegacySnakePagination,
  normalizeLegacySnakePagination,
  normalizePagination,
  normalizeStrictPagination,
  slicePageItems,
  toCanonicalApiPagination,
  toCanonicalPagePagination,
  toLastPage,
  toOffset,
  toPageNumber,
  toPerPageNumber,
  toWindowLimit,
}
