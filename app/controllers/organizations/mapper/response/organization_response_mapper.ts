export function mapOrganizationsIndexPageProps(input: {
  organizations: unknown
  pagination: unknown
  currentOrganizationId: string | null | undefined
  allOrganizations: unknown
}) {
  return {
    organizations: input.organizations,
    pagination: input.pagination,
    currentOrganizationId: input.currentOrganizationId,
    allOrganizations: input.allOrganizations,
  }
}

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
