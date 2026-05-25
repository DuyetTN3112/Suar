import ValidationException from '#modules/errors/public_contracts/validation_exception'

type RequestLike = { input(key: string, defaultValue?: unknown): unknown }
type NotificationListRequest = {
  page: number
  perPage: number
  after: string | null
  before: string | null
  unreadOnly: boolean
}

function integer(value: unknown, field: string, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : Number.NaN
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 100) throw ValidationException.field(field, `${field} must be an integer between 1 and 100`)
  return parsed
}
function optionalCursor(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw ValidationException.field(field, `${field} must be a string`)
  const result = value.trim()
  return result || null
}
function boolean(value: unknown, field: string, fallback = false): boolean {
  if (value === undefined) return fallback
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  throw ValidationException.field(field, `${field} must be a boolean`)
}
function build(
  request: RequestLike,
  pageKey: string,
  perPageKey: string,
  unreadKey: string,
  defaultPerPage: number
): NotificationListRequest {
  const requestedPage = integer(request.input(pageKey), pageKey, 1)
  const perPageInput = request.input(perPageKey) ?? (perPageKey === 'per_page' ? request.input('perPage') : undefined)
  return {
    page: perPageKey === 'limit' ? 1 : requestedPage,
    perPage: integer(perPageInput, perPageKey, defaultPerPage),
    after: optionalCursor(request.input('after'), 'after'),
    before: optionalCursor(request.input('before'), 'before'),
    unreadOnly: boolean(request.input(unreadKey), unreadKey),
  }
}
export function buildListNotificationsRequest(request: RequestLike): NotificationListRequest {
  return build(request, 'page', 'limit', 'unread_only', 15)
}
export function buildListNotificationsV1Request(request: RequestLike): NotificationListRequest {
  return build(request, 'page', 'per_page', 'unreadOnly', 20)
}

export function buildLatestNotificationsRequest(request: RequestLike): NotificationListRequest {
  return {
    ...build(request, 'page', 'limit', 'unread_only', 10),
    unreadOnly: false,
  }
}
