const SENSITIVE_FIELD_PATTERN = /(password|token|secret|authorization|cookie|session|refresh)/i

function shouldRedactKey(key: string): boolean {
  return SENSITIVE_FIELD_PATTERN.test(key)
}

export function redactSensitiveValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitiveValue(entry))
  }

  if (typeof value === 'object') {
    return redactSensitiveObject(value as Record<string, unknown>).value
  }

  return value
}

export function redactSensitiveObject(input: Record<string, unknown>): {
  readonly value: Record<string, unknown>
  readonly redactionApplied: boolean
} {
  let redactionApplied = false
  const output: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(input)) {
    if (shouldRedactKey(key)) {
      output[key] = '[REDACTED]'
      redactionApplied = true
      continue
    }

    if (Array.isArray(value)) {
      output[key] = value.map((entry) =>
        typeof entry === 'object' && entry !== null
          ? redactSensitiveObject(entry as Record<string, unknown>).value
          : redactSensitiveValue(entry)
      )
      continue
    }

    if (typeof value === 'object' && value !== null) {
      const nested = redactSensitiveObject(value as Record<string, unknown>)
      output[key] = nested.value
      redactionApplied = redactionApplied || nested.redactionApplied
      continue
    }

    output[key] = value
  }

  return { value: output, redactionApplied }
}
