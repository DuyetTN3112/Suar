import ValidationException from '#modules/errors/public_contracts/validation_exception'

export function buildJoinRequestsPageRequest(request: { input(key: string, fallback?: unknown): unknown }) {
  const rawPage = request.input('page')
  const page = rawPage === undefined ? 1 : typeof rawPage === 'string' && /^\d+$/.test(rawPage.trim()) ? Number(rawPage) : typeof rawPage === 'number' ? rawPage : Number.NaN
  if (!Number.isSafeInteger(page) || page < 1 || page > 100) throw ValidationException.field('page', 'page must be an integer between 1 and 100')
  const rawSearch = request.input('search')
  if (rawSearch === undefined || rawSearch === null || rawSearch === '') return { page, perPage: 50 }
  if (typeof rawSearch !== 'string') throw ValidationException.field('search', 'search must be a string')
  const search = rawSearch.trim()
  if (search.length > 200) throw ValidationException.field('search', 'search cannot exceed 200 characters')
  return { page, perPage: 50, ...(search ? { search } : {}) }
}
