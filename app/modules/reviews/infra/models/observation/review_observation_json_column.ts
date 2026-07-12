export function prepareReviewObservationJson(value: unknown): unknown {
  if (value === null || value === undefined || typeof value === 'string') {
    return value
  }
  return JSON.stringify(value)
}

export function consumeReviewObservationJson<T>(value: string | T): T {
  if (typeof value !== 'string') {
    return value
  }
  return JSON.parse(value) as T
}

export function consumeReviewObservationNumber(value: string | number | null): number | null {
  return value === null ? null : Number(value)
}
