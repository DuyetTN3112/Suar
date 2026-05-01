export function prepareJsonColumn(value: unknown): unknown {
  if (value === null || value === undefined || typeof value === 'string') {
    return value
  }
  return JSON.stringify(value)
}

export function consumeJsonColumn<T>(value: string | T): T {
  if (typeof value !== 'string') {
    return value
  }
  return JSON.parse(value) as T
}

export function consumeNullableNumber(value: string | number | null): number | null {
  if (value === null) {
    return null
  }
  return Number(value)
}

export default {
  prepareJsonColumn,
  consumeJsonColumn,
  consumeNullableNumber,
}
