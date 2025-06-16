import Organization from '#models/organization'
import type { DatabaseId } from '#types/database'

/**
 * OrganizationSettingsRepository (Infrastructure Layer)
 *
 * Handles all database queries for organization settings management.
 */

export interface UpdateOrganizationData {
  name?: string
  description?: string
  website?: string
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

    await org.save()

    return org
  }
}
