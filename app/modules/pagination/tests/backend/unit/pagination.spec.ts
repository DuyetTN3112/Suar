import { test } from '@japa/runner'

import {
  buildPaginationMeta,
  decodeTimestampCursor,
  definePaginationPolicy,
  encodeTimestampCursor,
  fromLegacySnakePagination,
  normalizeLegacySnakePagination,
  normalizePagination,
  normalizeStrictPagination,
  paginationPublicApi,
  slicePageItems,
  toLastPage,
  toOffset,
  toPageNumber,
  toPerPageNumber,
  toCanonicalApiPagination,
  toCanonicalPagePagination,
  toWindowLimit,
} from '#modules/pagination/public_contracts/pagination_public_api'

test.group('Unit | Pagination Core', () => {
  test('defines default pagination policy', ({ assert }) => {
    assert.deepEqual(definePaginationPolicy(), {
      DEFAULT_PAGE: 1,
      DEFAULT_PER_PAGE: 20,
      MAX_PER_PAGE: 100,
    })
  })

  test('allows pagination policy overrides', ({ assert }) => {
    assert.deepEqual(
      definePaginationPolicy({
        DEFAULT_PER_PAGE: 50,
        MAX_PER_PAGE: 200,
      }),
      {
        DEFAULT_PAGE: 1,
        DEFAULT_PER_PAGE: 50,
        MAX_PER_PAGE: 200,
      }
    )
  })

  test('normalizes page numbers from strings and invalid values', ({ assert }) => {
    assert.equal(toPageNumber('3', 1), 3)
    assert.equal(toPageNumber(0, 2), 1)
    assert.equal(toPageNumber('abc', 4), 4)
  })

  test('normalizes per-page with max clamp', ({ assert }) => {
    const policy = definePaginationPolicy({ DEFAULT_PER_PAGE: 25, MAX_PER_PAGE: 100 })

    assert.equal(toPerPageNumber('40', policy), 40)
    assert.equal(toPerPageNumber(0, policy), 1)
    assert.equal(toPerPageNumber(999, policy), 100)
    assert.equal(toPerPageNumber(undefined, policy), 25)
  })

  test('normalizes mixed pagination inputs with perPage/limit aliases', ({ assert }) => {
    const policy = definePaginationPolicy()

    assert.deepEqual(
      normalizePagination(
        {
          page: '2',
          limit: '30',
        },
        policy
      ),
      {
        page: 2,
        perPage: 30,
      }
    )

    assert.deepEqual(
      normalizePagination(
        {
          page: undefined,
          perPage: 999,
        },
        policy
      ),
      {
        page: 1,
        perPage: 100,
      }
    )
  })

  test('allows screen-specific defaults while preserving policy clamps', ({ assert }) => {
    const policy = definePaginationPolicy({ DEFAULT_PER_PAGE: 20, MAX_PER_PAGE: 100 })

    assert.deepEqual(normalizePagination({}, policy, { perPage: 15 }), {
      page: 1,
      perPage: 15,
    })

    assert.deepEqual(normalizePagination({ limit: 999 }, policy, { perPage: 15 }), {
      page: 1,
      perPage: 100,
    })
  })

  test('strict normalization rejects invalid values through caller-owned errors', ({ assert }) => {
    const policy = definePaginationPolicy({ DEFAULT_PER_PAGE: 20, MAX_PER_PAGE: 100 })
    const createError = (message: string) => new Error(`pagination:${message}`)

    assert.deepEqual(
      normalizeStrictPagination(
        { page: '2', limit: '10' },
        policy,
        { perPage: 25 },
        {
          createError,
          pageLessThanOne: 'page must be positive',
          perPageLessThanOne: 'limit must be positive',
          perPageTooLarge: 'limit too large',
        }
      ),
      {
        page: 2,
        perPage: 10,
      }
    )

    assert.throws(
      () =>
        normalizeStrictPagination(
          { page: 0, limit: 10 },
          policy,
          {},
          {
            createError,
            pageLessThanOne: 'page must be positive',
            perPageLessThanOne: 'limit must be positive',
            perPageTooLarge: 'limit too large',
          }
        ),
      /pagination:page must be positive/
    )

    assert.throws(
      () =>
        normalizeStrictPagination(
          { page: 1, limit: 101 },
          policy,
          {},
          {
            createError,
            pageLessThanOne: 'page must be positive',
            perPageLessThanOne: 'limit must be positive',
            perPageTooLarge: 'limit too large',
          }
        ),
      /pagination:limit too large/
    )
  })

  test('builds last-page and offset safely', ({ assert }) => {
    assert.equal(toLastPage(0, 20), 1)
    assert.equal(toLastPage(101, 20), 6)
    assert.equal(toOffset(3, 20), 40)
    assert.equal(toWindowLimit(3, 20), 60)
  })

  test('builds canonical pagination meta', ({ assert }) => {
    assert.deepEqual(
      buildPaginationMeta(87, {
        page: 2,
        perPage: 20,
      }),
      {
        total: 87,
        perPage: 20,
        currentPage: 2,
        lastPage: 5,
      }
    )
  })

  test('slices in-memory collections from normalized pagination', ({ assert }) => {
    assert.deepEqual(
      slicePageItems(['a', 'b', 'c', 'd', 'e'], {
        page: 2,
        perPage: 2,
      }),
      ['c', 'd']
    )
  })

  test('round-trips timestamp cursors and rejects malformed payloads', ({ assert }) => {
    const payload = {
      createdAt: '2026-07-23T10:00:00.000Z',
      id: 'record-1',
    }

    assert.deepEqual(decodeTimestampCursor(encodeTimestampCursor(payload)), payload)
    assert.isNull(decodeTimestampCursor('not-a-valid-cursor'))
    assert.isNull(
      decodeTimestampCursor(
        Buffer.from(JSON.stringify({ createdAt: '', id: 'record-1' }), 'utf8').toString(
          'base64url'
        )
      )
    )
  })

  test('maps offset pagination to canonical page shape', ({ assert }) => {
    const result = toCanonicalPagePagination({
      total: 45,
      perPage: 10,
      currentPage: 2,
      lastPage: 5,
    })

    assert.deepEqual(result, {
      mode: 'offset',
      page: 2,
      perPage: 10,
      total: 45,
      lastPage: 5,
      hasNextPage: true,
      hasPreviousPage: true,
    })
  })

  test('canonical pagination clamps empty legacy page counts for UI consumers', ({ assert }) => {
    const pagePagination = toCanonicalPagePagination({
      total: 0,
      perPage: 10,
      currentPage: 1,
      lastPage: 0,
    })
    const apiPagination = toCanonicalApiPagination({
      total: 0,
      perPage: 10,
      currentPage: 1,
      lastPage: 0,
    })

    assert.equal(pagePagination.lastPage, 1)
    assert.isFalse(pagePagination.hasNextPage)
    assert.isFalse(pagePagination.hasPreviousPage)
    assert.equal(apiPagination.lastPage, 1)
    assert.isFalse(apiPagination.hasNextPage)
    assert.isFalse(apiPagination.hasPreviousPage)
  })

  test('normalizes legacy snake pagination for old API payloads', ({ assert }) => {
    assert.deepEqual(
      normalizeLegacySnakePagination({
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 0,
      }),
      {
        total: 0,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      }
    )
  })

  test('maps legacy snake pagination to canonical api shape', ({ assert }) => {
    const result = toCanonicalApiPagination(
      fromLegacySnakePagination({
        total: 20,
        per_page: 5,
        current_page: 2,
        last_page: 4,
        cursor: {
          next_cursor: 'next',
          previous_cursor: 'prev',
          has_next_page: true,
          has_previous_page: true,
        },
      })
    )

    assert.deepEqual(result, {
      mode: 'cursor',
      page: 2,
      perPage: 5,
      total: 20,
      lastPage: 4,
      hasNextPage: true,
      hasPreviousPage: true,
      nextCursor: 'next',
      previousCursor: 'prev',
    })
  })

  test('exposes a public port facade for module boundaries', ({ assert }) => {
    const policy = paginationPublicApi.definePaginationPolicy({ DEFAULT_PER_PAGE: 15 })
    const pagination = paginationPublicApi.normalizePagination({ page: '2' }, policy)
    const meta = paginationPublicApi.buildPaginationMeta(31, pagination)

    assert.deepEqual(meta, {
      total: 31,
      perPage: 15,
      currentPage: 2,
      lastPage: 3,
    })
    assert.deepEqual(paginationPublicApi.toCanonicalPagePagination(meta), {
      mode: 'offset',
      page: 2,
      perPage: 15,
      total: 31,
      lastPage: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    })
  })
})
