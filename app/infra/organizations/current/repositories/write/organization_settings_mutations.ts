import Organization from '#infra/organizations/models/organization'
import type { CustomRoleDefinition, DatabaseId } from '#types/database'

export interface UpdateOrganizationData {
  name?: string
  description?: string
  website?: string
  custom_roles?: CustomRoleDefinition[] | null
}

export const updateOrganization = async (
  organizationId: DatabaseId,
  data: UpdateOrganizationData
): Promise<Organization> => {
  const org = await Organization.findOrFail(organizationId)

  if (data.name !== undefined) {
    org.name = data.name
  }

  if (data.description !== undefined) {
    org.description = data.description || null
  }

  if (data.website !== undefined) {
    org.website = data.website || null
  }

  if (data.custom_roles !== undefined) {
    org.custom_roles = data.custom_roles
  }

  await org.save()
  return org
}
