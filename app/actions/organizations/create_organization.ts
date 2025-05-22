import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import Organization from '#models/organization'
import AuditLog from '#models/audit_log'
import CreateAuditLog from '#actions/common/create_audit_log'

interface OrganizationData {
  name: string
  slug?: string
  description?: string
  logo?: string
  website?: string
  plan?: string
}

interface CreateOrganizationResult {
  success: boolean
  message: string
  organization?: Organization
}

@inject()
export default class CreateOrganization {
  constructor(
    protected ctx: HttpContext,
    private createAuditLog: CreateAuditLog
  ) {}

  async handle(data: OrganizationData): Promise<CreateOrganizationResult> {
    try {
      const user = this.ctx.auth.user!
      // Tạo tổ chức mới
      // Trigger MySQL sẽ tự động thêm owner vào tổ chức với role_id = 1 (admin)
      const organization = await Organization.create({
        name: data.name,
        slug: data.slug || this.generateSlug(data.name),
        description: data.description,
        logo: data.logo,
        website: data.website,
        plan: data.plan,
        owner_id: user.id,
      })

      // Ghi log hành động
      await this.createAuditLog.handle({
        user_id: user.id,
        action: 'create',
        entity_type: 'organization',
        entity_id: organization.id,
        new_values: organization.toJSON(),
      })

      return {
        success: true,
        message: 'Tổ chức đã được tạo thành công',
        organization,
      }
    } catch (error) {
      console.error('Lỗi khi tạo tổ chức:', error)
      return {
        success: false,
        message: error.message || 'Đã xảy ra lỗi khi tạo tổ chức',
      }
    }
  }

  /**
   * Tạo một slug từ tên tổ chức
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}
