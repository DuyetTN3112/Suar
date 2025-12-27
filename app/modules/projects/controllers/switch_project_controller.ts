import type { HttpContext } from '@adonisjs/core/http'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { projectPublicApi } from '#modules/projects/public_contracts/project_public_api'

export default class SwitchProjectController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx

    const projectId = request.input('project_id') as string | undefined
    if (!projectId) {
      throw new BusinessLogicException('Yêu cầu ID dự án')
    }

    const currentOrgId = session.get('current_organization_id') as string | undefined
    if (!currentOrgId) {
      throw new BusinessLogicException('Yêu cầu tổ chức hiện tại')
    }

    // Verify project belongs to current organization
    try {
      await projectPublicApi.ensureBelongsToOrganization(projectId, currentOrgId)
    } catch {
      throw new BusinessLogicException('Dự án không thuộc tổ chức hiện tại')
    }

    session.put('current_project_id', projectId)
    await session.commit()

    const projects = await projectPublicApi.listSimpleByOrganization(currentOrgId)
    const project = projects.find((p) => p.id === projectId)
    const projectName = project ? project.name : 'dự án đã chọn'

    response.json({
      success: true,
      message: `Đã chuyển sang dự án "${projectName}"`,
      redirect: '/tasks',
    });
  }
}
