import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import type { InviteUserDTO } from '../dtos/invite_user_dto.js'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

interface OrganizationRecord {
  id: number
  name: string
}

/**
 * Command: Invite User to Organization
 *
 * Pattern: Invitation record creation (without email)
 * Business rules:
 * - Only Owner (role_id = 1) or Admin (role_id = 2) can send invites
 * - Generate unique token for invitation
 * - Token expires in 7 days
 *
 * @example
 * const command = new InviteUserCommand(ctx)
 * await command.execute(dto)
 */
export default class InviteUserCommand {
  constructor(protected ctx: HttpContext) {}

  /**
   * Execute command: Invite user to organization
   *
   * Steps:
   * 1. Check permissions
   * 2. Check for duplicate invitations
   * 3. Begin transaction
   * 4. Create invitation record
   * 5. Create audit log
   * 6. Commit transaction
   */
  async execute(dto: InviteUserDTO): Promise<void> {
    const currentUser = this.ctx.auth.user
    if (!currentUser) {
      throw new Error('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Check permissions (Owner or Admin)
      await this.checkPermissions(dto.organizationId, currentUser.id, trx)

      // 2. Check for duplicate active invitations
      await this.checkDuplicateInvitation(dto, trx)

      // 3. Get organization details
      const organization = (await trx
        .from('organizations')
        .where('id', dto.organizationId)
        .first()) as OrganizationRecord | null

      if (!organization) {
        throw new Error(`Organization with ID ${String(dto.organizationId)} not found`)
      }

      // 4. Create invitation record
      const invitationData = dto.toObject()
      const result = await trx
        .insertQuery()
        .table('organization_invitations')
        .insert({
          ...invitationData,
          invited_by: currentUser.id,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        })
      const invitationId = (result as number[])[0]

      // 5. Create audit log
      await AuditLog.create(
        {
          user_id: currentUser.id,
          action: 'invite_user',
          entity_type: 'organization',
          entity_id: dto.organizationId,
          new_values: {
            email: dto.getNormalizedEmail(),
            role: dto.getRoleName(),
            invitation_id: invitationId,
          },
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
        },
        { client: trx }
      )

      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Check if user has permission to send invitations
   */
  private async checkPermissions(
    organizationId: number,
    userId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    const membership: unknown = await trx
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .whereIn('role_id', [1, 2]) // Owner or Admin
      .first()

    if (!membership) {
      throw new Error('You do not have permission to send invitations for this organization')
    }
  }

  /**
   * Helper: Check for duplicate active invitations
   */
  private async checkDuplicateInvitation(
    dto: InviteUserDTO,
    trx: TransactionClientContract
  ): Promise<void> {
    const existingInvitation: unknown = await trx
      .from('organization_invitations')
      .where('organization_id', dto.organizationId)
      .where('email', dto.getNormalizedEmail())
      .where('status', 'pending')
      .where('expires_at', '>', new Date())
      .first()

    if (existingInvitation) {
      throw new Error('An active invitation already exists for this email address')
    }
  }
}
