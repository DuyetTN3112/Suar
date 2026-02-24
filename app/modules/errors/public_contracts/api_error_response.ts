export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    errors?: Record<string, string>
  }
  meta?: {
    request_id?: string
    correlation_id?: string
  }
}

export interface ApiErrorMeta {
  request_id?: string
  correlation_id?: string
}

export function createApiError(
  code: string,
  message: string,
  errors?: Record<string, string>,
  meta?: ApiErrorMeta
): ApiErrorResponse {
  const response: ApiErrorResponse = {
    success: false,
    error: { code, message },
  }

  if (errors && Object.keys(errors).length > 0) {
    response.error.errors = errors
  }
  if (meta && (meta.request_id || meta.correlation_id)) {
    response.meta = meta
  }
  return response
}
