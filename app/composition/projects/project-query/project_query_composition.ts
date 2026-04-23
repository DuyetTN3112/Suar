import { ProjectAuditActivityReaderAdapter } from '#composition/adapters/projects/project_audit_activity_reader_adapter'
import { ProjectOrganizationReaderAdapter } from '#composition/adapters/projects/project_organization_reader_adapter'
import { ProjectReverseReviewReaderAdapter } from '#composition/adapters/projects/project_reverse_review_reader_adapter'
import { ProjectRoleStaffingReaderAdapter } from '#composition/adapters/projects/project_role_staffing_reader_adapter'
import { ProjectSwitchTargetReaderAdapter } from '#composition/adapters/projects/project_switch_target_reader_adapter'
import { ProjectTaskReaderWriterAdapter } from '#composition/adapters/projects/project_task_reader_writer_adapter'
import { ProjectTaskStatsReaderAdapter } from '#composition/adapters/projects/project_task_stats_reader_adapter'
import { ProjectUserReaderAdapter } from '#composition/adapters/projects/project_user_reader_adapter'
import { SearchProjectsCandidateReaderAdapter } from '#composition/adapters/search/search_projects_candidate_reader_adapter'
import { ComposedProjectQueryFactory } from '#composition/projects/project-context/factories/project_query_factory'
import { projectContextFactReader } from '#composition/projects/project-context/project_context_fact_reader_composition'
import {
  projectDetailProjectionReader,
  projectLifecycleRepository,
  projectListRepository,
  projectMemberCandidateReader,
  projectMembershipRepository,
} from '#composition/projects/project-membership/project_persistence_composition'
import { searchEngineCapability } from '#composition/search/search-engine/search_engine_composition'
import { taskUserReader } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import { LucidWorkPackageFactReader } from '#modules/projects/infra/adapters/work-package/lucid_work_package_fact_reader'

export const projectQueryFactory = new ComposedProjectQueryFactory({
  auditActivityReader: new ProjectAuditActivityReaderAdapter(),
  projectContextFactReader,
  workPackageCatalogReader: new LucidWorkPackageFactReader(),
  detailProjection: projectDetailProjectionReader,
  organizationReader: new ProjectOrganizationReaderAdapter(),
  projectMemberCandidateReader,
  projects: projectLifecycleRepository,
  projectList: projectListRepository,
  memberships: projectMembershipRepository,
  reverseReviews: new ProjectReverseReviewReaderAdapter(),
  roleStaffing: new ProjectRoleStaffingReaderAdapter(),
  searchCandidates: new SearchProjectsCandidateReaderAdapter(searchEngineCapability),
  switchTargets: new ProjectSwitchTargetReaderAdapter(),
  taskReader: new ProjectTaskReaderWriterAdapter(taskUserReader),
  taskStats: new ProjectTaskStatsReaderAdapter(),
  userReader: new ProjectUserReaderAdapter(),
})
