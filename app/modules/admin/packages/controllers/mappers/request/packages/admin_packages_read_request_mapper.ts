import ValidationException from '#modules/errors/public_contracts/validation_exception'

function text(request: { input(key: string): unknown }, key: string): string | undefined {
  const value = request.input(key)
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw ValidationException.field(key, `${key} must be a string`)
  const result = value.trim()
  if (result.length > 200) throw ValidationException.field(key, `${key} cannot exceed 200 characters`)
  return result || undefined
}

export function buildAdminPackagesRequest(request: { input(key: string): unknown }) {
  const rawPage = request.input('page') ?? 1
  const page = typeof rawPage === 'string' && /^\d+$/.test(rawPage.trim()) ? Number(rawPage) : rawPage
  if (typeof page !== 'number' || !Number.isSafeInteger(page) || page < 1 || page > 100) throw ValidationException.field('page', 'page must be an integer between 1 and 100')
  return { page, search: text(request, 'search'), plan: text(request, 'plan'), status: text(request, 'status') }
}
