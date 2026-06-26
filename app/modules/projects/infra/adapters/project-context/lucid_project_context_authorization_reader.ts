import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type {
  ProjectContextAuthorizationReader,
  ProjectContextAuthorizationRecord,
} from '#modules/projects/actions/ports/outbound/project-context/project_context_authorization_reader'
import type { ProjectTransaction } from '#modules/projects/actions/ports/outbound/project_transaction'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'

const CONTEXT_MANAGER_ROLES: readonly string[] = [ProjectRole.OWNER, ProjectRole.MANAGER]
const ORGANIZATION_MANAGER_ROLES: readonly string[] = ['org_owner', 'org_admin']

function lucidTransaction(transaction: ProjectTransaction): TransactionClientContract {
  return transaction as TransactionClientContract
}

/**
 * Resolves the actor's authority to publish a Project Context version.
 *
 * Authority is re-read inside the caller's transaction on every publication so a
 * revoked member cannot ride a stale session, and organization owners/admins are
 * honoured even when they hold no explicit project membership row.
 */
export class LucidProjectContextAuthorizationReader implements ProjectContextAuthorizationReader {
  async findContextAuthorization(
    input: { projectId: string; actorId: string },
    transaction: ProjectTransaction
  ): Promise<ProjectContextAuthorizationRecord> {
    const trx = lucidTransaction(transaction)

    const project = (await trx
      .from('projects')
      .select('id', 'organization_id')
      .where('id', input.projectId)
      .firstOrFail()) as { id: string; organization_id: string }

    const member = (await trx
      .from('project_members')
      .select('project_role')
      .where('project_id', project.id)
      .where('user_id', input.actorId)
      .first()) as { project_role: string | null } | null

    const organizationMember = (await trx
      .from('organization_users')
      .select('org_role')
      .where('organization_id', project.organization_id)
      .where('user_id', input.actorId)
      .first()) as { org_role: string | null } | null

    const canManageContext =
      (member?.project_role !== null &&
        member?.project_role !== undefined &&
        CONTEXT_MANAGER_ROLES.includes(member.project_role)) ||
      (organizationMember?.org_role !== null &&
        organizationMember?.org_role !== undefined &&
        ORGANIZATION_MANAGER_ROLES.includes(organizationMember.org_role))

    return {
      actorId: input.actorId,
      projectId: project.id,
      organizationId: project.organization_id,
      canManageContext,
    }
  }
}
