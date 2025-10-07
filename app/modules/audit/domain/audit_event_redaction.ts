const SENSITIVE_FIELD_PATTERN =
  /(password|token|secret|authorization|cookie|session|refresh|api_key)/i

export interface AuditRedactionResult {
  readonly value: unknown
  readonly redactionApplied: boolean
}

function shouldRedactKey(key: string): boolean {
  return SENSITIVE_FIELD_PATTERN.test(key)
}

export function redactAuditValue(value: unknown): AuditRedactionResult {
  if (Array.isArray(value)) {
    let redactionApplied = false
    const entries = value.map((entry) => {
      const result = redactAuditValue(entry)
      redactionApplied = redactionApplied || result.redactionApplied
      return result.value
    })

    return { value: entries, redactionApplied }
  }

  if (value && typeof value === 'object') {
    let redactionApplied = false
    const output: Record<string, unknown> = {}

    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (shouldRedactKey(key)) {
        output[key] = '[REDACTED]'
        redactionApplied = true
        continue
      }

      const nested = redactAuditValue(entry)
      output[key] = nested.value
      redactionApplied = redactionApplied || nested.redactionApplied
    }

    return { value: output, redactionApplied }
  }

  return { value, redactionApplied: false }
}
