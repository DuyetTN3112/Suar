import AppException from '#modules/errors/public_contracts/application_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'

type VineLikeMessage = {
  field?: string
  message?: string
}

function normalizeValidationErrors(err: unknown): Record<string, string> | null {
  if (!err || typeof err !== 'object' || !('messages' in err)) {
    return null
  }

  const candidate = Reflect.get(err, 'messages')
  if (!Array.isArray(candidate)) {
    return null
  }

  const normalized = candidate.reduce<Record<string, string>>((errors, entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return errors
    }

    const message = Reflect.get(entry as VineLikeMessage, 'message')
    if (typeof message !== 'string' || message.length === 0) {
      return errors
    }

    const field = Reflect.get(entry as VineLikeMessage, 'field')
    errors[typeof field === 'string' && field.length > 0 ? field : `field_${index + 1}`] = message
    return errors
  }, {})

  return Object.keys(normalized).length > 0 ? normalized : null
}

export function throwHttpValidationError(err: unknown): never {
  const errors = normalizeValidationErrors(err)
  if (errors) {
    throw ValidationException.fields(errors)
  }

  throw new ValidationException('Validation failed')
}

export function throwHttpBoundaryError(err: unknown): never {
  if (err instanceof AppException) {
    throw err
  }

  throw err
}
