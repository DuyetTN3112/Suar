import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'

interface OrganizationData {
  name?: string
  slug?: string
  description?: string
  logo?: string
  website?: string
  plan?: string
}

interface UpdateOrganizationResult {
  success: boolean
  message: string
  organization?: Organization
}

@inject()
export default class UpdateOrganization {
  constructor(protected ctx: HttpContext) {}

  async handle(id: string, data: OrganizationData): Promise<UpdateOrganizationResult> {
    try {
      const user = this.ctx.auth.user!
      const organization = await Organization.find(id)
      if (!organization) {
        return {
          success: false,
          message: 'Không tìm thấy tổ chức',
        }
      }

      // Kiểm tra quyền (chỉ owner mới có thể cập nhật tổ chức)
      if (organization.owner_id !== user.id) {
        return {
          success: false,
          message: 'Bạn không có quyền cập nhật tổ chức này',
        }
      }

      await organization.merge(data).save()
      return {
        success: true,
        message: 'Đã cập nhật tổ chức thành công',
        organization,
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật tổ chức:', error)
      return {
        success: false,
        message: 'Đã xảy ra lỗi khi cập nhật tổ chức',
      }
    }
  }
}
