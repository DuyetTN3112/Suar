import ValidationException from '#modules/errors/public_contracts/validation_exception'

export function requireRouteParam(params: unknown, name: string): string {
  const value = (params as Record<string, unknown>)[name]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw ValidationException.field(name, `Missing route param: ${name}`)
  }
  return value.trim()
}
