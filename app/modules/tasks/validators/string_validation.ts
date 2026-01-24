/** Canonical UUID validation shared by Task validator entry points. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function findRequiredUuidError(
  value: string | null | undefined,
  fieldLabel: string
): string | undefined {
  const candidate = value?.trim() ?? ''

  if (!candidate) return `${fieldLabel} is required`
  if (!UUID_PATTERN.test(candidate)) return `${fieldLabel} must be a valid UUID`
  return undefined
}
