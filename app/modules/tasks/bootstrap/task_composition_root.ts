import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/task_external_dependencies'
import { taskPublicApi } from '#modules/tasks/actions/services/task_public_api'
import { MonolithTaskOrgReader } from '#modules/tasks/bootstrap/adapters/monolith_task_org_reader'
import { MonolithTaskPermissionReader } from '#modules/tasks/bootstrap/adapters/monolith_task_permission_reader'
import { MonolithTaskProjectReader } from '#modules/tasks/bootstrap/adapters/monolith_task_project_reader'
import { MonolithTaskReviewReader } from '#modules/tasks/bootstrap/adapters/monolith_task_review_reader'
import { MonolithTaskSkillReader } from '#modules/tasks/bootstrap/adapters/monolith_task_skill_reader'
import { MonolithTaskUserReader } from '#modules/tasks/bootstrap/adapters/monolith_task_user_reader'

export const taskExternalDeps: TaskExternalDependencies = {
  org: new MonolithTaskOrgReader(),
  project: new MonolithTaskProjectReader(),
  user: new MonolithTaskUserReader(),
  review: new MonolithTaskReviewReader(),
  skill: new MonolithTaskSkillReader(),
  permission: new MonolithTaskPermissionReader(),
}

taskPublicApi.configureExternalDependencies(taskExternalDeps)
