export function prepareTaskContractJson(value: unknown): unknown {
  if (value === null || value === undefined || typeof value === 'string') {
    return value
  }
  return JSON.stringify(value)
}

export function consumeTaskContractJson(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}
