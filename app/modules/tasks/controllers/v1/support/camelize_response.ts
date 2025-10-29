import {
  findCanonicalProficiencyLevelOption,
  getCanonicalProficiencyLevelValue,
} from '#modules/skills/public_contracts/proficiency_framework'

const PROFICIENCY_CODE_KEYS = new Set([
  'required_public_proficiency_code',
  'requiredPublicProficiencyCode',
  'levelCode',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function looksLikeProficiencyLevelRecord(value: Record<string, unknown>): boolean {
  return (
    typeof value['id'] === 'string' &&
    (typeof value['code'] === 'string' ||
      typeof value['display_name'] === 'string' ||
      typeof value['displayName'] === 'string' ||
      typeof value['short_name'] === 'string' ||
      typeof value['shortName'] === 'string')
  )
}

function normalizeProficiencyLevelRecord(value: Record<string, unknown>): Record<string, unknown> {
  const option =
    [
      value['code'],
      value['display_name'],
      value['displayName'],
      value['short_name'],
      value['shortName'],
    ].reduce<ReturnType<typeof findCanonicalProficiencyLevelOption>>((matched, candidate) => {
      if (matched || typeof candidate !== 'string') {
        return matched
      }

      return findCanonicalProficiencyLevelOption(candidate)
    }, null) ?? null

  return {
    ...value,
    ...(typeof value['code'] === 'string'
      ? { code: option?.value ?? getCanonicalProficiencyLevelValue(value['code'], value['code']) }
      : {}),
    ...(typeof value['display_name'] === 'string'
      ? { display_name: option?.shortLabel ?? value['display_name'] }
      : {}),
    ...(typeof value['displayName'] === 'string'
      ? { displayName: option?.shortLabel ?? value['displayName'] }
      : {}),
    ...(typeof value['short_name'] === 'string' ? { short_name: option?.code ?? value['short_name'] } : {}),
    ...(typeof value['shortName'] === 'string' ? { shortName: option?.code ?? value['shortName'] } : {}),
  }
}

export function camelizeResponseValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => camelizeResponseValue(item))
  }

  if (isRecord(value)) {
    const normalizedValue = looksLikeProficiencyLevelRecord(value)
      ? normalizeProficiencyLevelRecord(value)
      : value
    const output: Record<string, unknown> = {}

    for (const [key, nestedValue] of Object.entries(normalizedValue)) {
      const camelKey = toCamelCaseKey(key)

      if (typeof nestedValue === 'string' && PROFICIENCY_CODE_KEYS.has(key)) {
        output[camelKey] = getCanonicalProficiencyLevelValue(nestedValue, nestedValue)
        continue
      }

      if (typeof nestedValue === 'string' && PROFICIENCY_CODE_KEYS.has(camelKey)) {
        output[camelKey] = getCanonicalProficiencyLevelValue(nestedValue, nestedValue)
        continue
      }

      output[camelKey] = camelizeResponseValue(nestedValue)
    }

    return output
  }

  return value
}
