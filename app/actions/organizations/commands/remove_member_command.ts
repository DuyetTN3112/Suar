import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import AuditLog from '#models/audit_log'
import type { RemoveMemberDTO } from '../dtos/remove_member_dto.js'
import type CreateNotification from '#actions/common/create_notification'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

interface MembershipRecord {
  organization_id: number
  user_id: number
  role_id: number
}

interface ProjectRecord {
  id: number
}

interface ConversationRecord {
  id: number
}

/**
 * Command: Remove Member from Organization
 *
 * Pattern: Cascading actions with task reassignment (learned from Projects module)
 * Business rules:
 * - Only Owner (role_id = 1) or Admin (role_id = 2) can remove members
 * - Cannot remove Owner
 * - Reassign or unassign member's tasks before removal
 * - Send notification to removed member
 *
 * @example
 * const command = new RemoveMemberCommand(ctx, createNotification)
 * await command.execute(dto)
 */
export default class RemoveMemberCommand {
  constructor(
    protected ctx: HttpContext,
    private createNotification: CreateNotification
  ) {}

  /**
   * Execute command: Remove member from organization
   *
   * Steps:
   * 1. Check permissions
   * 2. Validate target member can be removed
   * 3. Begin transaction
   * 4. Handle task reassignment
   * 5. Remove member
   * 6. Create audit log
   * 7. Commit transaction
   * 8. Send notification
   */
  async execute(dto: RemoveMemberDTO): Promise<void> {
    const currentUser = this.ctx.auth.user
    if (!currentUser) {
      throw new Error('Unauthorized')
    }
    const trx = await db.transaction()

    try {
      // 1. Check permissions (Owner or Admin)
      await this.checkPermissions(dto.organizationId, currentUser.id, trx)

      // 2. Get target member's role
      const targetMembership = (await trx
        .from('organization_users')
        .where('organization_id', dto.organizationId)
        .where('user_id', dto.userId)
        .first()) as MembershipRecord | null

      if (!targetMembership) {
        throw new Error('User is not a member of this organization')
      }

      // 3. Cannot remove Owner
      if (targetMembership.role_id === 1) {
        throw new Error('Cannot remove organization owner. Transfer ownership first.')
      }

      // 4. Handle task reassignment (unassign all tasks)
      await this.unassignMemberTasks(dto.organizationId, dto.userId, trx)

      // 5. Remove from conversation_participants (logic từ after_organization_user_update trigger)
      await this.removeFromConversations(dto.organizationId, dto.userId, trx)

      // 6. Remove member from organization
      await trx
        .from('organization_users')
        .where('organization_id', dto.organizationId)
        .where('user_id', dto.userId)
        .delete()

      // 7. Create audit log
      await AuditLog.create(
        {
          user_id: currentUser.id,
          action: 'remove_member',
          entity_type: 'organization',
          entity_id: dto.organizationId,
          old_values: targetMembership,
          new_values: {
            removed_user_id: dto.userId,
            removed_user_role: this.getRoleName(targetMembership.role_id),
            reason: dto.getNormalizedReason(),
          },
          ip_address: this.ctx.request.ip(),
          user_agent: this.ctx.request.header('user-agent') || '',
        },
        { client: trx }
      )

      await trx.commit()

      // 8. Send notification
      await this.sendMemberRemovedNotification(dto)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Helper: Check if user has permission to remove members
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
      throw new Error('You do not have permission to remove members from this organization')
    }
  }

  /**
   * Helper: Unassign all tasks assigned to member
   */
  private async unassignMemberTasks(
    organizationId: number,
    userId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    // Find all projects in this organization
    const projects = (await trx
      .from('projects')
      .where('organization_id', organizationId)
      .whereNull('deleted_at')
      .select('id')) as ProjectRecord[]

    if (projects.length === 0) return

    const projectIds = projects.map((p) => p.id)

    // Unassign tasks in these projects
    await trx
      .from('tasks')
      .whereIn('project_id', projectIds)
      .where('assigned_to', userId)
      .whereNull('deleted_at')
      .update({
        assigned_to: null,
        updated_at: new Date(),
      })
  }

  /**
   * Helper: Remove user from all organization conversations
   * Logic từ after_organization_user_update trigger
   */
  private async removeFromConversations(
    organizationId: number,
    userId: number,
    trx: TransactionClientContract
  ): Promise<void> {
    // Get all conversation IDs in this organization
    const conversations = (await trx
      .from('conversations')
      .where('organization_id', organizationId)
      .select('id')) as ConversationRecord[]

    if (conversations.length === 0) return

    const conversationIds = conversations.map((c) => c.id)

    // Delete user from these conversations
    await trx
      .from('conversation_participants')
      .where('user_id', userId)
      .whereIn('conversation_id', conversationIds)
      .delete()
  }

  /**
   * Helper: Get role name from role ID
   */
  private getRoleName(roleId: number): string {
    const roleNames: Record<number, string> = {
      1: 'Owner',
      2: 'Admin',
      3: 'Manager',
      4: 'Member',
      5: 'Viewer',
    }
    return roleNames[roleId] ?? 'Unknown'
  }

  /**
   * Helper: Send notification to removed member
   */
  private async sendMemberRemovedNotification(dto: RemoveMemberDTO): Promise<void> {
    try {
      await this.createNotification.handle({
        user_id: dto.userId,
        title: 'Đã rời khỏi tổ chức',
        message: `Bạn đã bị xóa khỏi tổ chức${dto.hasReason() ? `: ${dto.getNormalizedReason() ?? ''}` : ''}`,
        type: 'member_removed',
        related_entity_type: 'organization',
        related_entity_id: dto.organizationId,
      })
    } catch (error) {
      console.error('[RemoveMemberCommand] Failed to send notification:', error)
    }
  }
}
