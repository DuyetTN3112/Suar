import BusinessLogicException from '#exceptions/business_logic_exception'
import { PAGINATION } from '#modules/common/constants/common_constants'
import { ErrorMessages } from '#modules/errors/constants/error_constants'

export function throwInvalidInput(errorMessage: string = ErrorMessages.INVALID_INPUT): never {
  throw new BusinessLogicException(errorMessage)
}

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
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

export function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
  }

  return value.map((entry) => {
    if (typeof entry !== 'string') {
      throw new BusinessLogicException(ErrorMessages.INVALID_INPUT)
    }

    return entry
  })
}

export function toOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  return toStringArray(value)
}

export function toNumberOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return undefined
}

export function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }

  return fallback
}

export function requireEnumValue<T extends string>(
  value: unknown,
  allowedValues: readonly T[],
  errorMessage: string = ErrorMessages.INVALID_INPUT
): T {
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throwInvalidInput(errorMessage)
  }

  return value as T
}

export { PAGINATION }
