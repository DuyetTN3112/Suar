import AppException from '#modules/errors/public_contracts/application_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationTaskStatusCreateInput } from '#modules/organizations/actions/dtos/request/workflow/organization_task_status_create_input'
import type { OrganizationTaskStatusCreator } from '#modules/organizations/actions/ports/outbound/workflow/organization_task_status_creator'

export default class CreateOrganizationTaskStatusCommand {
  constructor(
    protected execCtx: OrganizationActionContext,
    private readonly creator: OrganizationTaskStatusCreator
  ) {}

  async executeAndWrap(
    dto: OrganizationTaskStatusCreateInput
  ): Promise<Result<Awaited<ReturnType<OrganizationTaskStatusCreator['create']>>, AppException>> {
    try {
      return Result.ok(await this.execute(dto))
    } catch (error) {
      if (error instanceof AppException) return Result.fail(error)
      throw error
    }
  }

  async execute(dto: OrganizationTaskStatusCreateInput) {
    return this.creator.create(dto, this.execCtx)
  }
}
