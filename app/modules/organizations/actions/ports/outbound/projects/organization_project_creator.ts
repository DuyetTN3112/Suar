import type { OrganizationProjectCreateInput } from '#modules/organizations/actions/dtos/request/projects/organization_project_create_input'
import type { OrganizationProjectMutationResult } from '#modules/organizations/actions/dtos/response/projects/organization_project_mutation_result'

export interface OrganizationProjectCreateContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
  readonly requestId?: string | null
  readonly traceId?: string | null
  readonly workflowId?: string | null
}

export abstract class OrganizationProjectCreator {
  abstract create(
    input: OrganizationProjectCreateInput,
    context: OrganizationProjectCreateContext
  ): Promise<OrganizationProjectMutationResult>
}
