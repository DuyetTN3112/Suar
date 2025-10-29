import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { OrganizationUserStatus } from '#modules/organizations/public_contracts/organization_constants'

type QueryClient = typeof db | TransactionClientContract

export async function hasProjectApplicationReviewRole(
  userId: string,
  projectId: string | null | undefined,
  client: QueryClient = db
): Promise<boolean> {
  if (!projectId) return false

  const membership: unknown = await client
    .from('project_members')
    .where('project_id', projectId)
    .where('user_id', userId)
    .whereIn('project_role', ['project_owner', 'project_manager'])
    .first()

  return membership !== null && membership !== undefined
}

export async function hasOrganizationApplicationReviewRole(
  userId: string,
  organizationId: string | null | undefined,
  client: QueryClient = db
): Promise<boolean> {
  if (!organizationId) return false

  const membership: unknown = await client
    .from('organization_users')
    .where('organization_id', organizationId)
    .where('user_id', userId)
    .where('status', OrganizationUserStatus.APPROVED)
    .whereIn('org_role', ['org_owner', 'org_admin'])
    .first()

  return membership !== null && membership !== undefined
}
