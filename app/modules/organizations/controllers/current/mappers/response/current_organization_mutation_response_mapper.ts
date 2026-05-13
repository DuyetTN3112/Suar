export function mapCurrentOrganizationMutationApiBody(
  message: string,
  extra: Record<string, unknown> = {}
) {
  return {
    success: true,
    message,
    ...extra,
  }
}

export function mapCurrentOrganizationSuccessApiBody(
  message: string,
  extra: Record<string, unknown> = {}
) {
  return mapCurrentOrganizationMutationApiBody(message, extra)
}
