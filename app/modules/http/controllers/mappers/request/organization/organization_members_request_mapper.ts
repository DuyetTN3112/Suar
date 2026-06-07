import ValidationException from '#modules/errors/public_contracts/validation_exception'

interface RequestLike {
  input(key: string): unknown
}

export function buildOrganizationMembersRequest(
  params: Record<string, unknown>,
  request: RequestLike
): { organizationId: string; q?: string } {
  const organizationId = params['organizationId']
  if (typeof organizationId !== 'string' || organizationId.trim().length === 0) {
    throw ValidationException.field('organizationId', 'organizationId is required')
  }
  const rawQ = request.input('q')
  if (rawQ === undefined || rawQ === null || rawQ === '') return { organizationId: organizationId.trim() }
  if (typeof rawQ !== 'string') throw ValidationException.field('q', 'q must be a string')
  const q = rawQ.trim()
  if (q.length > 200) throw ValidationException.field('q', 'q cannot exceed 200 characters')
  return q.length > 0 ? { organizationId: organizationId.trim(), q } : { organizationId: organizationId.trim() }
}
