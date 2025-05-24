import { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

interface GetOrganizationParams {
  id: number
}

interface GetOrganizationResult {
  success: boolean
  message?: string
  organization?: any
  userRole?: {
    roleName: string
    roleId: number
  }
}

export default class GetOrganization {
  protected ctx: HttpContext

  constructor(ctx: HttpContext) {
    this.ctx = ctx
  }

  async handle({ id }: GetOrganizationParams): Promise<GetOrganizationResult> {
    try {
      if (!id) {
        return {
          success: false,
          message: 'ID tổ chức không hợp lệ',
        }
      }

      const user = this.ctx.auth.user
      if (!user) {
        return {
          success: false,
          message: 'Bạn chưa đăng nhập',
        }
      }

      const organization = await Organization.find(id)
      if (!organization) {
        return {
          success: false,
          message: 'Không tìm thấy tổ chức',
        }
      }

      // Kiểm tra user có phải là thành viên của tổ chức không
      const isMember = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', user.id)
        .first()

      if (!isMember) {
        return {
          success: false,
          message: 'Bạn không phải là thành viên của tổ chức này',
        }
      }

      // Truy vấn thông tin organization_users và join với users và user_roles
      const organizationMembersQuery = await db
        .from('organization_users as ou')
        .join('users as u', 'ou.user_id', '=', 'u.id')
        .join('user_roles as ur', 'ou.role_id', '=', 'ur.id')
        .where('ou.organization_id', organization.id)
        .whereNull('u.deleted_at')
        .select(
          'ou.user_id',
          'ou.organization_id',
          'ou.role_id',
          'u.id as uid',
          'u.first_name',
          'u.last_name',
          'u.full_name',
          'u.email',
          'ur.id as role_id',
          'ur.name as role_name'
        )

      // Định dạng lại dữ liệu để phù hợp với trình bày
      const organizationUsers = organizationMembersQuery.map((member) => ({
        user_id: member.user_id,
        organization_id: member.organization_id,
        role_id: member.role_id,
        user: {
          id: member.uid,
          first_name: member.first_name,
          last_name: member.last_name,
          full_name: member.full_name,
          email: member.email,
        },
        role: {
          id: member.role_id,
          name: member.role_name,
        },
      }))

      // Lấy role của user trong tổ chức
      const userRole = await db
        .from('organization_users')
        .join('user_roles', 'organization_users.role_id', '=', 'user_roles.id')
        .where('organization_id', organization.id)
        .where('user_id', user.id)
        .select('user_roles.name as role_name', 'organization_users.role_id')
        .first()

      // Kết hợp dữ liệu để trả về
      const organizationData = {
        ...organization.toJSON(),
        organization_users: organizationUsers,
      }

      return {
        success: true,
        organization: organizationData,
        userRole: userRole
          ? {
              roleName: userRole.role_name,
              roleId: userRole.role_id,
            }
          : undefined,
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin tổ chức:', error)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi lấy thông tin tổ chức',
      }
    }
  }
}
