function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

function camelizeResponseValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map((item) => camelizeResponseValue(item))
  }

  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>
    const output: Record<string, unknown> = {}

    for (const [key, nestedValue] of Object.entries(input)) {
      output[toCamelCaseKey(key)] = camelizeResponseValue(nestedValue)
    }

    return output
  }

  return value
}

export function mapSprintDataApiBody(data: unknown) {
  return {
    data: camelizeResponseValue(data),
  }
}

export function mapSprintListApiBody(result: { data: unknown[]; pagination: unknown }) {
  return {
    data: camelizeResponseValue(result.data),
    pagination: result.pagination,
  }
}
