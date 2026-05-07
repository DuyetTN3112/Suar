import ValidationException from '#modules/errors/public_contracts/validation_exception'

export function buildAdminSubscriptionsRequest(request: { input(key: string): unknown }) {
  const rawPage = request.input('page') ?? 1
  const rawPerPage = request.input('perPage') ?? request.input('per_page') ?? 20
  const integer = (value: unknown, field: string) => {
    const result = typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : value
    if (typeof result !== 'number' || !Number.isSafeInteger(result) || result < 1 || result > 100) {
      throw ValidationException.field(field, `${field} must be an integer between 1 and 100`)
    }
    return result
  }
  return { page: integer(rawPage, 'page'), perPage: integer(rawPerPage, 'perPage') }
}
