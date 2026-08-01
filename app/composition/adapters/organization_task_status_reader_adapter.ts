import { listTaskStatusesQuery } from '#composition/task_application_composition'
import { OrganizationTaskStatusReader } from '#modules/organizations/workflow/actions/ports/outbound/organization_task_status_reader'

export class OrganizationTaskStatusReaderAdapter extends OrganizationTaskStatusReader {
  async listByOrganization(organizationId: string) {
    const statuses = await listTaskStatusesQuery.execute(organizationId)

    return statuses.map((status) => ({
      id: status.id,
      name: status.name,
      color: status.color,
      order: status.sort_order,
      isDefault: status.is_default,
    }))
  }
}
