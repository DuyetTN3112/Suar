import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import Organization from '#models/organization'
import AuditLog from '#models/audit_log'
import type CreateNotification from '#actions/common/create_notification'

/**
 * DTO for transferring organization ownership
 */
export interface TransferOrganizationOwnershipDTO {
    organization_id: number
    new_owner_id: number
}

/**
 * Command: Transfer Organization Ownership
 *
 * Migrate từ stored procedure: transfer_organization_ownership
 *
 * Business rules:
 * - Chỉ owner hiện tại mới có thể transfer
 * - Không thể transfer cho chính mình
 * - New owner phải là member approved
 * - New owner phải có role ít nhất là org_admin
 * - Cập nhật role: old owner → org_admin, new owner → org_owner
 *
 * @example
 * const command = new TransferOrganizationOwnershipCommand(ctx, createNotification)
 * await command.execute(dto)
 */
export default class TransferOrganizationOwnershipCommand {
    constructor(
        protected ctx: HttpContext,
        private createNotification: CreateNotification
    ) { }

    async execute(dto: TransferOrganizationOwnershipDTO): Promise<Organization> {
        const currentUser = this.ctx.auth.user!
        const trx = await db.transaction()

        try {
            // 1. Load organization with lock
            const organization = await Organization.query({ client: trx })
                .where('id', dto.organization_id)
                .whereNull('deleted_at')
                .forUpdate()
                .firstOrFail()

            // 2. Validate current user is owner
            if (organization.owner_id !== currentUser.id) {
                throw new Error('Chỉ owner hiện tại mới có thể transfer ownership')
            }

            // 3. Cannot transfer to self
            if (currentUser.id === dto.new_owner_id) {
                throw new Error('Không thể transfer ownership cho chính mình')
            }

            // 4. Validate new owner is approved member
            const newOwnerMembership = await db
                .from('organization_users')
                .where('user_id', dto.new_owner_id)
                .where('organization_id', dto.organization_id)
                .where('status', 'approved')
                .useTransaction(trx as any)
                .first()

            if (!newOwnerMembership) {
                throw new Error('Owner mới phải là member approved của tổ chức')
            }

            // 5. Validate new owner has at least org_admin role
            const newOwnerRole = await db
                .from('organization_users')
                .join('organization_roles', 'organization_users.role_id', 'organization_roles.id')
                .where('organization_users.user_id', dto.new_owner_id)
                .where('organization_users.organization_id', dto.organization_id)
                .select('organization_roles.name as role_name')
                .useTransaction(trx as any)
                .first()

            if (!['org_owner', 'org_admin'].includes(newOwnerRole?.role_name)) {
                throw new Error('Owner mới phải có vai trò ít nhất là org_admin')
            }

            // 6. Get role IDs
            const orgOwnerRole = await db
                .from('organization_roles')
                .where('name', 'org_owner')
                .whereNull('organization_id')
                .first()

            const orgAdminRole = await db
                .from('organization_roles')
                .where('name', 'org_admin')
                .whereNull('organization_id')
                .first()

            if (!orgOwnerRole || !orgAdminRole) {
                throw new Error('Không tìm thấy roles trong hệ thống')
            }

            // Save old values for audit
            const oldOwnerId = organization.owner_id

            // 7. Update organization owner
            organization.owner_id = dto.new_owner_id
            await organization.useTransaction(trx).save()

            // 8. Demote old owner to org_admin
            await db
                .from('organization_users')
                .where('user_id', currentUser.id)
                .where('organization_id', dto.organization_id)
                .update({
                    role_id: orgAdminRole.id,
                    updated_at: new Date(),
                })
                .useTransaction(trx as any)

            // 9. Promote new owner to org_owner
            await db
                .from('organization_users')
                .where('user_id', dto.new_owner_id)
                .where('organization_id', dto.organization_id)
                .update({
                    role_id: orgOwnerRole.id,
                    updated_at: new Date(),
                })
                .useTransaction(trx as any)

            // 10. Create audit log
            await AuditLog.create(
                {
                    user_id: currentUser.id,
                    action: 'transfer_ownership',
                    entity_type: 'organization',
                    entity_id: dto.organization_id,
                    old_values: { owner_id: oldOwnerId },
                    new_values: { owner_id: dto.new_owner_id },
                    ip_address: this.ctx.request.ip(),
                    user_agent: this.ctx.request.header('user-agent') || '',
                },
                { client: trx }
            )

            await trx.commit()

            // 11. Send notifications (outside transaction)
            await this.sendNotifications(organization, currentUser.id, dto.new_owner_id)

            return organization
        } catch (error) {
            await trx.rollback()
            throw error
        }
    }

    /**
     * Send notifications to both old and new owners
     */
    private async sendNotifications(
        organization: Organization,
        oldOwnerId: number,
        newOwnerId: number
    ): Promise<void> {
        try {
            // Notify new owner
            await this.createNotification.handle({
                user_id: newOwnerId,
                title: 'Bạn đã trở thành owner',
                message: `Bạn đã được chuyển giao quyền sở hữu tổ chức "${organization.name}".`,
                type: 'ownership_transferred',
                related_entity_type: 'organization',
                related_entity_id: organization.id,
            })

            // Notify old owner
            await this.createNotification.handle({
                user_id: oldOwnerId,
                title: 'Đã chuyển giao quyền sở hữu',
                message: `Bạn đã chuyển giao quyền sở hữu tổ chức "${organization.name}".`,
                type: 'ownership_transferred',
                related_entity_type: 'organization',
                related_entity_id: organization.id,
            })
        } catch (error) {
            console.error('[TransferOrganizationOwnershipCommand] Failed to send notifications:', error)
        }
    }
}
