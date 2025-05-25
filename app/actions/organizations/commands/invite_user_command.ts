import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import mail from '@adonisjs/mail/services/main'
import type { InviteUserDTO } from '../dtos/invite_user_dto.js'

/**
 * Command: Invite User to Organization
 *
 * Pattern: Email invitation with token (learned from Auth module)
 * Business rules:
 * - Only Owner (role_id = 1) or Admin (role_id = 2) can send invites
 * - Generate unique token for invitation
 * - Send email with invitation link
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
   * 7. Send invitation email (outside transaction)
   */
  async execute(dto: InviteUserDTO): Promise<void> {
    const currentUser = this.ctx.auth.user!
    const trx = await db.transaction()

    try {
      // 1. Check permissions (Owner or Admin)
      await this.checkPermissions(dto.organizationId, currentUser.id, trx)

      // 2. Check for duplicate active invitations
      await this.checkDuplicateInvitation(dto, trx)

      // 3. Get organization details for email
      const organization = await db
        .from('organizations')
        .where('id', dto.organizationId)
        .useTransaction(trx)
        .first()

      if (!organization) {
        throw new Error(`Organization with ID ${dto.organizationId} not found`)
      }

      // 4. Create invitation record
      const invitationData = dto.toObject()
      const [invitationId] = await db
        .table('organization_invitations')
        .useTransaction(trx)
        .insert({
          ...invitationData,
          invited_by: currentUser.id,
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date(),
        })

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
          metadata: JSON.stringify({
            invitation_token: invitationData.token,
            expires_at: invitationData.expires_at,
          }),
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
        },
        { client: trx }
      )

      await trx.commit()

      // 6. Send invitation email (outside transaction)
      await this.sendInvitationEmail(dto, organization.name, invitationData.token)
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
    trx: unknown
  ): Promise<void> {
    const membership = await db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('user_id', userId)
      .whereIn('role_id', [1, 2]) // Owner or Admin
      .useTransaction(trx)
      .first()

    if (!membership) {
      throw new Error('You do not have permission to send invitations for this organization')
    }
  }

  /**
   * Helper: Check for duplicate active invitations
   */
  private async checkDuplicateInvitation(dto: InviteUserDTO, trx: unknown): Promise<void> {
    const existingInvitation = await db
      .from('organization_invitations')
      .where('organization_id', dto.organizationId)
      .where('email', dto.getNormalizedEmail())
      .where('status', 'pending')
      .where('expires_at', '>', new Date())
      .useTransaction(trx)
      .first()

    if (existingInvitation) {
      throw new Error('An active invitation already exists for this email address')
    }
  }

  /**
   * Helper: Send invitation email
   */
  private async sendInvitationEmail(
    dto: InviteUserDTO,
    organizationName: string,
    token: string
  ): Promise<void> {
    try {
      // Build invitation link
      const invitationLink = `${process.env.APP_URL || 'http://localhost:3333'}/organizations/invitations/accept?token=${token}`

      await mail.send((message) => {
        message.to(dto.getNormalizedEmail()).subject(`Lời mời tham gia tổ chức ${organizationName}`)
          .html(`
            <h2>Lời mời tham gia tổ chức</h2>
            <p>Bạn đã được mời tham gia tổ chức <strong>${organizationName}</strong> với vai trò <strong>${dto.getRoleNameVi()}</strong>.</p>
            ${dto.hasMessage() ? `<p><em>${dto.getNormalizedMessage()}</em></p>` : ''}
            <p>
              <a href="${invitationLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                Chấp nhận lời mời
              </a>
            </p>
            <p>Hoặc sao chép link sau vào trình duyệt:</p>
            <p>${invitationLink}</p>
            <p><small>Lời mời này sẽ hết hạn sau 7 ngày.</small></p>
          `)
      })
    } catch (error) {
      console.error('[InviteUserCommand] Failed to send invitation email:', error)
      throw new Error('Failed to send invitation email')
    }
  }
}
