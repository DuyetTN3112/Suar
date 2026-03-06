import { createHash } from 'node:crypto'

export interface AuditEventHashInput {
  readonly event: unknown
  readonly prevHash: string | null
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry))
  }

  if (value && typeof value === 'object') {
    const normalized: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (key === 'event_hash') {
        continue
      }
      normalized[key] = normalizeValue((value as Record<string, unknown>)[key])
    }
    return normalized
  }

  return value
}

export function computeAuditEventHash(input: AuditEventHashInput): string {
  const canonicalPayload = JSON.stringify({
    event: normalizeValue(input.event),
    prev_hash: input.prevHash ?? null,
  })

  return createHash('sha256').update(canonicalPayload).digest('hex')
}
