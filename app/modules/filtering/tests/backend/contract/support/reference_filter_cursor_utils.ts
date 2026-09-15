import { createHash } from 'node:crypto'

import type { FilterAuthorizationBinding, FilterExecutorInput } from '#modules/filtering/actions/ports/outbound/filter_query_executor'

export interface CursorPayload {
  v: 1
  criteriaHash: string
  authorizationHash: string
  position: number
  expiresAt: number
}

export function criteriaHash(input: FilterExecutorInput): string {
  return sha256(
    stableJson({
      context: input.definition.key,
      schemaVersion: input.definition.version,
      criteria: { ...input.criteria, page: { size: input.criteria.page.size } },
      mandatoryFilter: input.mandatoryFilter,
      eligibilityFilter: input.eligibilityFilter,
    })
  )
}

export function authorizationHash(binding: FilterAuthorizationBinding): string {
  return sha256(
    stableJson({
      context: binding.context,
      schemaVersion: binding.schemaVersion,
      authorizationVersion: binding.authorizationVersion,
      mandatoryFingerprint: binding.mandatoryFingerprint,
      eligibilityFingerprint: binding.eligibilityFingerprint,
      effectiveContextFingerprint: binding.effectiveContextFingerprint,
    })
  )
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function isCursorPayload(value: unknown): value is CursorPayload {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return (
    Object.keys(record).length === 5 &&
    Object.hasOwn(record, 'v') &&
    Object.hasOwn(record, 'criteriaHash') &&
    Object.hasOwn(record, 'authorizationHash') &&
    Object.hasOwn(record, 'position') &&
    Object.hasOwn(record, 'expiresAt') &&
    record['v'] === 1 &&
    typeof record['criteriaHash'] === 'string' &&
    /^[a-f0-9]{64}$/u.test(record['criteriaHash']) &&
    typeof record['authorizationHash'] === 'string' &&
    /^[a-f0-9]{64}$/u.test(record['authorizationHash']) &&
    Number.isSafeInteger(record['position']) &&
    Number(record['position']) >= 0 &&
    Number.isSafeInteger(record['expiresAt']) &&
    Number(record['expiresAt']) >= 0
  )
}
