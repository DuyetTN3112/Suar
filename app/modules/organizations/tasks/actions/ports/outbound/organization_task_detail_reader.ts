import type { OrganizationActionContext } from '#modules/organizations/tasks/actions/action_context'
import type { OrganizationTaskDetailPage } from '#modules/organizations/tasks/actions/dtos/response/organization_task_pages'

export abstract class OrganizationTaskDetailReader {
  abstract read(
    taskId: string,
    organizationId: string,
    context: OrganizationActionContext
  ): Promise<OrganizationTaskDetailPage>
}
