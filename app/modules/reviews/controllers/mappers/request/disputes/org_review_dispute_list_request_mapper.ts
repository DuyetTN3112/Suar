import ValidationException from '#modules/errors/public_contracts/validation_exception'
type RequestLike = { input(key: string, fallback?: unknown): unknown }
function value(request: RequestLike, key: string, max = 256): string | null {
  const raw = request.input(key)
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw !== 'string' || raw.length > max) throw ValidationException.field(key, `${key} is invalid`)
  return raw.trim() || null
}
function page(request: RequestLike, key: string, fallback: number): number {
  const raw = request.input(key)
  if (raw === undefined) return fallback
  const result = typeof raw === 'string' && /^\d+$/.test(raw.trim()) ? Number(raw) : typeof raw === 'number' ? raw : Number.NaN
  if (!Number.isSafeInteger(result) || result < 1) throw ValidationException.field(key, `${key} must be positive`)
  return result
}
export function buildOrgReviewDisputeListRequest(request: RequestLike) {
  const perPageValue = request.input('perPage') ?? request.input('per_page')
  return {
    page: page(request, 'page', 1),
    perPage: page({ input: () => perPageValue }, 'perPage', 20),
    after: value(request, 'after'),
    before: value(request, 'before'),
    status: value(request, 'status'),
    search: value(request, 'search', 200),
  }
}
