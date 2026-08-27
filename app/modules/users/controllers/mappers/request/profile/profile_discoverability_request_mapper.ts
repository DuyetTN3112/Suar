import ValidationException from '#modules/errors/public_contracts/validation_exception'

export function buildProfileDiscoverabilityRequest(payload: unknown): { isSearchable: boolean } {
  const value =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)['is_searchable'] ??
        (payload as Record<string, unknown>)['isSearchable']
      : undefined
  if (typeof value !== 'boolean') {
    throw ValidationException.field('is_searchable', 'Discoverability must be true or false')
  }
  return { isSearchable: value }
}
