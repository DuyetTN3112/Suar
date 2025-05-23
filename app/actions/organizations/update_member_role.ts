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
      if (!organizationId || !memberId || !roleId) {
        return {
          success: false,
          message: 'Thiếu thông tin cần thiết',
        }
      }

      const user = this.ctx.auth.user
      if (!user) {
        return {
          success: false,
          message: 'Bạn chưa đăng nhập',
        }
      }

      const organization = await Organization.find(organizationId)
      if (!organization) {
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

      // Chỉ có superadmin tổ chức (1) mới có quyền cập nhật vai trò
      if (!userRole || userRole.role_id !== 1) {
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

      if (!memberExists) {
        return {
          success: false,
          message: 'Thành viên này không thuộc tổ chức',
        }
      }

      // Không thể thay đổi vai trò của owner
      if (organization.owner_id === memberId && roleId !== 1) {
        return {
          success: false,
          message: 'Không thể thay đổi vai trò của chủ sở hữu tổ chức',
        }
      }

      // Kiểm tra vai trò có hợp lệ không
      if (![1, 2, 3].includes(roleId)) {
        return {
          success: false,
          message: 'Vai trò không hợp lệ',
        }
      }

      // Đảm bảo roleId là số nguyên
      const roleIdNumber = Number(roleId)

      // LƯU Ý: Thực hiện nhiều cách khác nhau để cập nhật database
      let updateSuccess = false
      let errorDetails = []
      // Cách 0: Trước tiên, kiểm tra xem vai trò đã thay đổi chưa
      if (memberExists.role_id === roleIdNumber) {
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
        if (result1 && result1.affectedRows > 0) {
          updateSuccess = true
        } else {
          errorDetails.push("Raw SQL update didn't affect any rows")
        }
      } catch (err1) {
        console.error('Lỗi cập nhật vai trò (phương thức 1):', err1.message)
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
          if (result2 && (result2 as any) > 0) {
            updateSuccess = true
          } else {
            errorDetails.push('Query builder update returned 0 affected rows')
          }
        } catch (err2) {
          console.error('Lỗi cập nhật vai trò (phương thức 2):', err2.message)
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
          if (result3 && result3.affectedRows > 0) {
            updateSuccess = true
          } else {
            errorDetails.push("Direct SQL with FORCE didn't affect any rows")
          }
        } catch (err3) {
          console.error('Lỗi cập nhật vai trò (phương thức 3):', err3.message)
          errorDetails.push(`Method 3 error: ${err3.message}`)
        }
      }
      // Kiểm tra lại sau khi cập nhật
      const afterUpdate = await db
        .from('organization_users')
        .where('organization_id', organization.id)
        .where('user_id', memberId)
        .first()
      // Map vai trò để hiển thị thông báo
      const roleNames = {
        1: 'Superadmin',
        2: 'Admin',
        3: 'User',
      }
      // Kiểm tra xem database có thực sự được cập nhật không
      if (afterUpdate && afterUpdate.role_id === roleIdNumber) {
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
        console.error('Cập nhật vai trò thất bại: Database không ghi nhận thay đổi')
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
      console.error('Lỗi khi cập nhật vai trò:', error.message)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi cập nhật vai trò',
        debug: error.message,
      }
    }
  }
}
