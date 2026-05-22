import ValidationException from '#modules/errors/public_contracts/validation_exception'

export function buildFilterContextRequest(params: unknown): { context: string } {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    throw ValidationException.field('params', 'params must be an object')
  }
  const context = (params as Record<string, unknown>)['context']
  if (typeof context !== 'string' || context.length === 0 || context.length > 256) {
    throw ValidationException.field('context', 'context is invalid')
  }
  return { context }
}
