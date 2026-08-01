import { ProjectAuditActivityReaderAdapter } from './project_audit_activity_reader_adapter.js'
import { ProjectOrganizationReaderAdapter } from './project_organization_reader_adapter.js'
import { ProjectReverseReviewReaderAdapter } from './project_reverse_review_reader_adapter.js'
import { ProjectUserReaderAdapter } from './project_user_reader_adapter.js'

import type { OrganizationProjectDetailReader } from '#modules/organizations/projects/actions/ports/outbound/organization_project_detail_reader'
import type { ProjectDetailProjectionReader } from '#modules/projects/actions/ports/outbound/project_detail_projection_reader'
import { ProjectDetailReader } from '#modules/projects/actions/ports/outbound/project_detail_reader'
import type { ProjectTaskReaderWriter } from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import type { ProjectLifecycleRepository } from '#modules/projects/actions/ports/outbound/project_lifecycle_repository'
import type { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import GetProjectDetailQuery from '#modules/projects/actions/queries/get_project_detail_query'
import type {
  GetProjectDetailInput,
  GetProjectDetailResult,
} from '#modules/projects/public_contracts/project_detail'

export class ProjectDetailReaderAdapter
  extends ProjectDetailReader
  implements OrganizationProjectDetailReader
{
  private readonly auditActivityReader = new ProjectAuditActivityReaderAdapter()
  private readonly organizationReader = new ProjectOrganizationReaderAdapter()
  private readonly reverseReviewReader = new ProjectReverseReviewReaderAdapter()
  private readonly userReader = new ProjectUserReaderAdapter()

  constructor(
    private readonly taskReader: ProjectTaskReaderWriter,
    private readonly projects: ProjectLifecycleRepository,
    private readonly memberships: ProjectMembershipRepository,
    private readonly detailProjection: ProjectDetailProjectionReader
  ) {
    super()
  }

  get(
    input: GetProjectDetailInput,
    execCtx: ProjectActionContext
  ): Promise<GetProjectDetailResult> {
    return new GetProjectDetailQuery(
      execCtx,
      this.auditActivityReader,
      this.organizationReader,
      this.taskReader,
      this.userReader,
      this.reverseReviewReader,
      this.projects,
      this.memberships,
      this.detailProjection
    ).handle(input)
  }
}
