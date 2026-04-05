import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'

export interface GetProjectCreatePageResult {
  organizations: Awaited<ReturnType<typeof organizationPublicApi.listUserOwnedOrganizations>>
  statuses: { id: string; name: string; value: string; label: string }[]
}

export default class GetProjectCreatePageQuery {
  constructor(protected execCtx: ProjectActionContext) {}

  async execute(): Promise<GetProjectCreatePageResult> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const organizations = await organizationPublicApi.listUserOwnedOrganizations(userId)

    const statuses = [
      { id: 'pending', name: 'Pending', value: 'pending', label: 'Chờ duyệt' },
      { id: 'in_progress', name: 'In Progress', value: 'in_progress', label: 'Đang thực hiện' },
      { id: 'completed', name: 'Completed', value: 'completed', label: 'Hoàn thành' },
      { id: 'cancelled', name: 'Cancelled', value: 'cancelled', label: 'Đã hủy' },
    ]

    return {
      organizations,
      statuses,
    }
  }
}
