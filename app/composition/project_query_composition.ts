import { ProjectAuditActivityReaderAdapter } from './adapters/project_audit_activity_reader_adapter.js'
import { ProjectOrganizationReaderAdapter } from './adapters/project_organization_reader_adapter.js'
import { ProjectReverseReviewReaderAdapter } from './adapters/project_reverse_review_reader_adapter.js'
import { ProjectRoleStaffingReaderAdapter } from './adapters/project_role_staffing_reader_adapter.js'
import { ProjectSwitchTargetReaderAdapter } from './adapters/project_switch_target_reader_adapter.js'
import { ProjectTaskReaderWriterAdapter } from './adapters/project_task_reader_writer_adapter.js'
import { ProjectTaskStatsReaderAdapter } from './adapters/project_task_stats_reader_adapter.js'
import { ProjectUserReaderAdapter } from './adapters/project_user_reader_adapter.js'
import { SearchProjectsCandidateReaderAdapter } from './adapters/search_projects_candidate_reader_adapter.js'
import { ComposedProjectQueryFactory } from './factories/project_query_factory.js'
import {
  projectDetailProjectionReader,
  projectLifecycleRepository,
  projectListRepository,
  projectMemberCandidateReader,
  projectMembershipRepository,
} from './project_persistence_composition.js'
import { searchEngineCapability } from './search_engine_composition.js'
import { taskUserReader } from './task_external_dependencies_composition.js'

export const projectQueryFactory = new ComposedProjectQueryFactory({
  auditActivityReader: new ProjectAuditActivityReaderAdapter(),
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
