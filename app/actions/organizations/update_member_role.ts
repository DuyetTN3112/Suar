import { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'

interface UpdateMemberRoleParams {
  organizationId: number
  memberId: number
  roleId: number
}

interface UpdateMemberRoleResult {
  success: boolean
  message: string
  debug?: any
}

export default class UpdateMemberRole {
  protected ctx: HttpContext

  constructor(ctx: HttpContext) {
    this.ctx = ctx
  }

  async handle({
    organizationId,
    memberId,
    roleId,
  }: UpdateMemberRoleParams): Promise<UpdateMemberRoleResult> {
    try {
      console.log('[UpdateMemberRole] Starting update with params:', {
        organizationId,
        memberId,
        roleId,
        roleIdType: typeof roleId,
      })
      if (!organizationId || !memberId || !roleId) {
        console.log('[UpdateMemberRole] Missing required parameters')
        return {
          success: false,
          message: 'Thiếu thông tin cần thiết',
        }
      }

      const user = this.ctx.auth.user
      if (!user) {
        console.log('[UpdateMemberRole] No authenticated user found')
        return {
          success: false,
          message: 'Bạn chưa đăng nhập',
        }
      }

      const organization = await Organization.find(organizationId)
      if (!organization) {
        console.log('[UpdateMemberRole] Organization not found:', organizationId)
        return {
          success: false,
          message: 'Không tìm thấy tổ chức',
        }
      }

      // Kiểm tra quyền (chỉ superadmin của tổ chức mới có thể cập nhật vai trò)
      const userRole = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', user.id)
        .select('role_id')
        .first()
      console.log('[UpdateMemberRole] User role check:', userRole)

      // Chỉ có superadmin tổ chức (1) mới có quyền cập nhật vai trò
      if (!userRole || userRole.role_id !== 1) {
        console.log('[UpdateMemberRole] User does not have permission to update roles')
        return {
          success: false,
          message: 'Bạn không có quyền cập nhật vai trò thành viên',
        }
      }

      // Kiểm tra thành viên có tồn tại trong tổ chức không
      const memberExists = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', memberId)
        .first()
      console.log('[UpdateMemberRole] Member check:', memberExists)

      if (!memberExists) {
        console.log('[UpdateMemberRole] Member not found in organization')
        return {
          success: false,
          message: 'Thành viên này không thuộc tổ chức',
        }
      }

      // Không thể thay đổi vai trò của owner
      if (organization.owner_id === memberId && roleId !== 1) {
        console.log('[UpdateMemberRole] Attempting to change owner role')
        return {
          success: false,
          message: 'Không thể thay đổi vai trò của chủ sở hữu tổ chức',
        }
      }

      // Kiểm tra vai trò có hợp lệ không
      if (![1, 2, 3].includes(roleId)) {
        console.log('[UpdateMemberRole] Invalid role ID:', roleId)
        return {
          success: false,
          message: 'Vai trò không hợp lệ',
        }
      }

      // Cập nhật vai trò - Tạo và log query trước khi thực hiện
      console.log('[UpdateMemberRole] Updating role in database...')
      console.log('[UpdateMemberRole] Current role_id of member:', memberExists.role_id)
      console.log('[UpdateMemberRole] New role_id to set:', roleId)
      // Đảm bảo roleId là số nguyên
      const roleIdNumber = Number(roleId)

      // LƯU Ý: Thực hiện nhiều cách khác nhau để cập nhật database
      let updateSuccess = false
      let errorDetails = []
      // Cách 0: Trước tiên, kiểm tra xem vai trò đã thay đổi chưa
      if (memberExists.role_id === roleIdNumber) {
        console.log('[UpdateMemberRole] Role already set to requested value, no change needed')
        return {
          success: true,
          message: 'Người dùng đã có vai trò này trong tổ chức',
          debug: {
            noChangeNeeded: true,
            currentRole: memberExists.role_id,
            requestedRole: roleIdNumber,
          },
        }
      }
      // Cách 1: Sử dụng rawQuery
      try {
        const sql = `UPDATE organization_users 
                    SET role_id = ?, updated_at = NOW() 
                    WHERE organization_id = ? AND user_id = ?`
        const result1 = await db.rawQuery(sql, [roleIdNumber, organizationId, memberId])
        console.log('[UpdateMemberRole] Raw SQL update result 1:', result1)
        if (result1 && result1.affectedRows > 0) {
          updateSuccess = true
        } else {
          errorDetails.push("Raw SQL update didn't affect any rows")
        }
      } catch (err1) {
        console.error('[UpdateMemberRole] Error in method 1:', err1)
        errorDetails.push(`Method 1 error: ${err1.message}`)
      }
      // Cách 2: Sử dụng update method của query builder
      if (!updateSuccess) {
        try {
          const result2 = await db
            .from('organization_users')
            .where('organization_id', organizationId)
            .where('user_id', memberId)
            .update({
              role_id: roleIdNumber,
              updated_at: new Date(),
            })
          console.log('[UpdateMemberRole] Query builder update result 2:', result2)
          if (result2 && (result2 as any) > 0) {
            updateSuccess = true
          } else {
            errorDetails.push('Query builder update returned 0 affected rows')
          }
        } catch (err2) {
          console.error('[UpdateMemberRole] Error in method 2:', err2)
          errorDetails.push(`Method 2 error: ${err2.message}`)
        }
      }
      // Cách 3: Sử dụng SQL trực tiếp với FORCE UPDATE
      if (!updateSuccess) {
        try {
          const sql3 = `UPDATE organization_users 
                      FORCE INDEX (PRIMARY)
                      SET role_id = ${roleIdNumber}, updated_at = NOW() 
                      WHERE organization_id = ${organizationId} AND user_id = ${memberId}`
          const result3 = await db.rawQuery(sql3)
          console.log('[UpdateMemberRole] Direct SQL update result 3:', result3)
          if (result3 && result3.affectedRows > 0) {
            updateSuccess = true
          } else {
            errorDetails.push("Direct SQL with FORCE didn't affect any rows")
          }
        } catch (err3) {
          console.error('[UpdateMemberRole] Error in method 3:', err3)
          errorDetails.push(`Method 3 error: ${err3.message}`)
        }
      }
      // Kiểm tra lại sau khi cập nhật
      const afterUpdate = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', memberId)
        .first()
      console.log('[UpdateMemberRole] Member after update:', afterUpdate)
      // Map vai trò để hiển thị thông báo
      const roleNames = {
        1: 'Superadmin',
        2: 'Admin',
        3: 'User',
      }
      // Kiểm tra xem database có thực sự được cập nhật không
      if (afterUpdate && afterUpdate.role_id === roleIdNumber) {
        console.log('[UpdateMemberRole] Update confirmed successfully')
        return {
          success: true,
          message: `Đã cập nhật vai trò thành ${roleNames[roleIdNumber as keyof typeof roleNames]} thành công`,
          debug: {
            updateSuccess,
            methods: {
              used: updateSuccess ? 'Multiple methods tried' : 'None worked',
              errors: errorDetails,
            },
            before: memberExists,
            after: afterUpdate,
          },
        }
      } else {
        // Lỗi khi cập nhật database
        console.error('[UpdateMemberRole] Database update verification failed')
        return {
          success: false,
          message: 'Cập nhật thất bại. Database không ghi nhận thay đổi.',
          debug: {
            updateSuccess,
            methods: {
              used: updateSuccess
                ? 'Claimed successful but verification failed'
                : 'All methods failed',
              errors: errorDetails,
            },
            expected: roleIdNumber,
            actual: afterUpdate ? afterUpdate.role_id : 'unknown',
            before: memberExists,
            after: afterUpdate,
          },
        }
      }
    } catch (error) {
      console.error('[UpdateMemberRole] Error updating role:', error)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi cập nhật vai trò',
        debug: error.message,
      }
    }
  }
}
