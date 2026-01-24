/** Stable defensive-redaction contract for audit-event producers and readers. */
const SENSITIVE_FIELD_PATTERN =
  /(password|token|secret|authorization|cookie|session|refresh|api_key)/i

const SENSITIVE_TEXT_REPLACEMENTS: ReadonlyArray<{
  pattern: RegExp
  replacement: string
}> = [
  {
    pattern:
      /\b(password|passphrase|token|access[_-]?token|refresh[_-]?token|api[_-]?key|client[_-]?secret|authorization|cookie|session[_-]?(?:id|token))\b(\s*[:=]\s*)(?:(?:Bearer\s+)?["']?[^,\s;&}"']{4,}["']?)/gi,
    replacement: '$1$2[REDACTED]',
  },
  {
    pattern: /\b(Bearer)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
    replacement: '$1 [REDACTED]',
  },
  {
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\b/g,
    replacement: '[REDACTED_JWT]',
  },
]

export interface AuditRedactionResult {
  readonly value: unknown
  readonly redactionApplied: boolean
}

function shouldRedactKey(key: string): boolean {
  return SENSITIVE_FIELD_PATTERN.test(key)
}

function redactSensitiveText(value: string): AuditRedactionResult {
  const redacted = SENSITIVE_TEXT_REPLACEMENTS.reduce(
    (current, { pattern, replacement }) => current.replace(pattern, replacement),
    value
  )

  return {
    value: redacted,
    redactionApplied: redacted !== value,
  }
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

  if (typeof value === 'string') {
    return redactSensitiveText(value)
  }

  return { value, redactionApplied: false }
}
