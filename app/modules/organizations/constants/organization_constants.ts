/**
 * Organization Constants
 *
 * Constants liên quan đến Organization, OrganizationUser, OrganizationRole.
 * v3.0: organization_roles table xóa, dùng org_role VARCHAR inline trên organization_users.
 *
 * CLEANUP 2026-03-01:
 *   - XÓA OrganizationRoleName, OrganizationRoleNameType → duplicate OrganizationRole
 *   - XÓA organizationRoleOptions, getOrganizationRoleName, getOrganizationRoleNameVi → 0 usages
 *   - XÓA isOrganizationAdmin, isOrganizationManager → duplicate nhau, 0 usages
 *   - XÓA organizationUserStatusOptions, getOrganizationUserStatusName, getOrganizationUserStatusNameVi → 0 usages
 *   - XÓA organizationPlanOptions → 0 usages
 *   - THÊM PartnerType → DB v3 có partner_type CHECK ('gold','silver','bronze')
 *
 * @module OrganizationConstants
 */

/**
 * Organization Role — v3.0 string codes (thay vì integer IDs)
 * Mapped trực tiếp với organization_users.org_role VARCHAR CHECK
 */
export enum OrganizationRole {
  OWNER = 'org_owner',
  ADMIN = 'org_admin',
  MEMBER = 'org_member',
}

/**
 * Organization User Status
 * Trạng thái thành viên trong tổ chức
 * v3.0 CHECK: 'pending', 'approved', 'rejected'
 */
export enum OrganizationUserStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Partner Type — v3.0 inline CHECK trên organizations.partner_type
 * CHECK ('gold', 'silver', 'bronze')
 */
export enum PartnerType {
  GOLD = 'gold',
  SILVER = 'silver',
  BRONZE = 'bronze',
}
