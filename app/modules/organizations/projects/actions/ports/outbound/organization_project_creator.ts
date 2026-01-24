import type { OrganizationProjectCreateInput } from '#modules/organizations/projects/actions/dtos/request/organization_project_create_input'
import type { OrganizationProjectMutationResult } from '#modules/organizations/projects/actions/dtos/response/organization_project_mutation_result'

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
