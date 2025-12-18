export function mapOrganizationMutationApiBody(
  message: string,
  extra: Record<string, unknown> = {}
) {
  return {
    success: true,
    message,
    ...extra,
  }
}

export function mapOrganizationSuccessApiBody(
  message: string,
  extra: Record<string, unknown> = {}
) {
  return mapOrganizationMutationApiBody(message, extra)
}

export function mapOrganizationDetailApiBody<T extends object>(data: T) {
  return {
    success: true,
    data,
  }
}
