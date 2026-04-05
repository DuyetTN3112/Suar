import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ConflictException from '#modules/http/exceptions/conflict_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import ValidationException from '#modules/http/exceptions/validation_exception'

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

export function throwTaskRequirementValidationError(err: unknown): never {
  const errors = normalizeValidationErrors(err)
  if (errors) {
    throw ValidationException.fields(errors)
  }

  throw new ValidationException('Validation failed')
}

export function throwTaskRequirementBoundaryError(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err)

  if (
    message === 'Skill already required in this task'
  ) {
    throw new ConflictException(message)
  }

  if (
    message === 'Task skill requirement not found' ||
    message === 'Task requirement version not found' ||
    message === 'Role not found in project' ||
    message.startsWith('Requirement version ') ||
    message.startsWith('Proficiency level not found:')
  ) {
    throw new NotFoundException(message)
  }

  if (
    message === 'Mandatory skill requirement must have a minimum level' ||
    message === 'Weight must be >= 0' ||
    message === 'All proficiency levels must belong to the same proficiency scale' ||
    message === 'Minimum level ordinal must be <= target level ordinal' ||
    message === 'Target level ordinal must be <= assessment ceiling level ordinal' ||
    message === 'Minimum level ordinal must be <= assessment ceiling level ordinal' ||
    message === 'Rubric version not found' ||
    message === 'Rubric version does not belong to the specified skill' ||
    message === 'Project professional role not found' ||
    message === 'Cannot prefill from an inactive project professional role' ||
    message.startsWith('requiredPublicProficiencyCode must be a canonical code')
  ) {
    throw new BusinessLogicException(message)
  }

  throw err
}
