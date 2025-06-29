const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const toNumberValue = (value: unknown): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const getExtraNumber = (row: unknown, key: string): number => {
  if (!isRecord(row)) {
    return 0
  }
  const extras = row.$extras
  if (!isRecord(extras)) {
    return 0
  }
  return toNumberValue(extras[key])
}

export const getCountValue = (row: unknown, key: string): number => {
  if (!isRecord(row)) {
    return 0
  }
  return toNumberValue(row[key])
}

export const isRawRecord = isRecord
