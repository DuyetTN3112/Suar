import { PAGINATION } from '#modules/common/constants/common_constants'

export function toPositiveNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.trunc(value))
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return Math.max(1, Math.trunc(parsed))
    }
  }

  return fallback
}

export function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

export function toOptionalNullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }

  return toOptionalString(value)
}

export function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export function toOptionalBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }

  return undefined
}

export function toBoolean(value: unknown, fallback = false): boolean {
  return toOptionalBoolean(value) ?? fallback
}

export { PAGINATION }
