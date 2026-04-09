import { AppError } from './app_error.js'

export function isError(value: unknown): value is Error {
  return value instanceof Error
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}

export function getErrorMessage(error: unknown, fallbackMessage = 'Có lỗi xảy ra'): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  return fallbackMessage
}

export function getErrorCode(error: unknown): string | undefined {
  if (isAppError(error)) {
    return error.code
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: unknown }).code
    if (typeof code === 'string') {
      return code
    }
  }

  return undefined
}

export function getErrorStatusCode(error: unknown, fallbackStatus = 500): number {
  if (isAppError(error)) {
    return error.statusCode
  }

  if (error && typeof error === 'object') {
    if (
      'statusCode' in error &&
      typeof (error as { statusCode: unknown }).statusCode === 'number'
    ) {
      return (error as { statusCode: number }).statusCode
    }

    if ('status' in error && typeof (error as { status: unknown }).status === 'number') {
      return (error as { status: number }).status
    }
  }

  return fallbackStatus
}
