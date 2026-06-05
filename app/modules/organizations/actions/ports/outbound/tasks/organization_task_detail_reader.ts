import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationTaskDetailPage } from '#modules/organizations/actions/dtos/response/tasks/organization_task_pages'

export abstract class OrganizationTaskDetailReader {
  abstract read(
    taskId: string,
    organizationId: string,
    context: OrganizationActionContext
  ): Promise<OrganizationTaskDetailPage>
}
