import Organization from '#models/organization'
import type { CustomRoleDefinition, DatabaseId } from '#types/database'

/**
 * OrganizationSettingsRepository (Infrastructure Layer)
 *
 * Handles all database queries for organization settings management.
 */

export interface UpdateOrganizationData {
  name?: string
  description?: string
  website?: string
  custom_roles?: CustomRoleDefinition[] | null
}

export interface OrganizationData {
  id: string
  name: string
  description: string | null
  website: string | null
  email: string | null
}

export default class OrganizationSettingsRepository {
  /**
   * Get organization by ID
   */
  async getOrganization(organizationId: DatabaseId): Promise<OrganizationData | null> {
    const org = await Organization.find(organizationId)

    if (!org) return null

    return {
      id: org.id,
      name: org.name,
      description: org.description,
      website: org.website,
      email: null, // Email is stored elsewhere or not available in current schema
    }
  }

  /**
   * Update organization settings
   */
  async updateOrganization(
    organizationId: DatabaseId,
    data: UpdateOrganizationData
  ): Promise<Organization> {
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
}
