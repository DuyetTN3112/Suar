import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import type { OrganizationActionContext } from '#modules/organizations/directory/actions/organization_action_context'
import type { OrganizationTaskDetailPage } from '#modules/organizations/tasks/actions/dtos/response/organization_task_pages'
import { OrganizationTaskDetailReader } from '#modules/organizations/tasks/actions/ports/outbound/organization_task_detail_reader'
import GetTaskDetailDTO from '#modules/tasks/actions/dtos/request/get_task_detail_dto'
import type { TaskDetailQueryFactory } from '#modules/tasks/actions/ports/inbound/task_detail_query_factory'
import { findActiveTaskIdentity } from '#modules/tasks/infra/repositories/read/detail_queries'

export class TasksOrganizationTaskDetailReaderAdapter extends OrganizationTaskDetailReader {
  constructor(private readonly queries: TaskDetailQueryFactory) {
    super()
  }

  async read(
    taskId: string,
    organizationId: string,
    context: OrganizationActionContext
  ): Promise<OrganizationTaskDetailPage> {
    const identity = await findActiveTaskIdentity(taskId)
    if (!identity || identity.organization_id !== organizationId) {
      throw NotFoundException.task(taskId)
    }

    return this.queries.makeDetail(context).execute(GetTaskDetailDTO.createFull(taskId))
  }
}
