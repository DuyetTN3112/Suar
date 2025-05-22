import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import { DateTime } from 'luxon'

interface DeleteOrganizationResult {
  success: boolean
  message: string
}

@inject()
export default class DeleteOrganization {
  constructor(protected ctx: HttpContext) {}

  async handle(id: string): Promise<DeleteOrganizationResult> {
    try {
      const user = this.ctx.auth.user!
      const organization = await Organization.find(id)
      if (!organization) {
        return {
          success: false,
          message: 'Không tìm thấy tổ chức',
        }
      }

      // Kiểm tra quyền (chỉ owner mới có thể xóa tổ chức)
      if (organization.owner_id !== user.id) {
        return {
          success: false,
          message: 'Bạn không có quyền xóa tổ chức này',
        }
      }

      // Soft delete tổ chức
      organization.deleted_at = DateTime.now()
      await organization.save()
      return {
        success: true,
        message: 'Đã xóa tổ chức thành công',
      }
    } catch (error) {
      console.error('Lỗi khi xóa tổ chức:', error)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi xóa tổ chức',
      }
    }
  }
}
