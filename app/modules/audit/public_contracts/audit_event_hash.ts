import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

/** Stable integrity contract for audit-event producers and readers. */
export interface AuditEventHashInput {
  readonly event: unknown
  readonly prevHash: string | null
}

export type AuditEventIntegrityStatus = 'legacy_unsealed' | 'mismatch' | 'verified'

export interface AuditEventHashProvider {
  digest(canonicalPayload: string): string
}

let provider: AuditEventHashProvider | null = null

export function registerAuditEventHashProvider(implementation: AuditEventHashProvider): void {
  provider = implementation
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
    const record = value as Record<string, unknown>
    for (const key of Object.keys(value).sort()) {
      if (key === 'event_hash') {
        continue
      }
      normalized[key] = normalizeValue(record[key])
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

  if (!provider) {
    throw new InvariantViolationException('Audit event hash provider has not been registered')
  }
  return provider.digest(canonicalPayload)
}

export function verifyAuditEventHash(input: {
  readonly event: unknown
  readonly eventHash: string | null | undefined
  readonly prevHash: string | null
}): AuditEventIntegrityStatus {
  if (!input.eventHash) {
    return 'legacy_unsealed'
  }

  const expectedHash = computeAuditEventHash({
    event: input.event,
    prevHash: input.prevHash,
  })

  return expectedHash === input.eventHash ? 'verified' : 'mismatch'
}
