import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { packageId } from './sprints/sprint_context_loader.js'
import {
  linkTasksToSprint,
  SPRINT_SPECS,
  upsertSprint,
} from './sprints/sprint_core_seeder.js'
import {
  seedSprintReviewDisputes,
  upsertReverseReviewWorkflows,
} from './sprints/sprint_reverse_review_seeder.js'
import {
  REVIEW_PACKAGE_SPECS,
  upsertPackage,
  upsertSprintReviews,
} from './sprints/sprint_review_package_seeder.js'
import type {
  ProjectKey,
  SeededProject,
  SeededSprint,
  SeededTask,
  SeededUser,
  UserKey,
} from './types.js'

export { seedSprintReviewDisputes }

export async function seedSprints(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>,
  projects: Record<ProjectKey, SeededProject>,
  tasks: Record<string, SeededTask>
): Promise<Record<string, SeededSprint>> {
  const sprints: Record<string, SeededSprint> = {}

  for (const spec of SPRINT_SPECS) {
    const sprint = await upsertSprint(runtime, trx, spec, users, projects)
    await linkTasksToSprint(trx, sprint, spec, tasks)
    sprints[spec.key] = sprint

    if (spec.status !== 'review_open') {
      continue
    }

    for (const packageSpec of REVIEW_PACKAGE_SPECS) {
      await upsertPackage(
        runtime,
        trx,
        sprint,
        users[packageSpec.reviewer],
        packageSpec.status,
        packageId(sprint.id, packageSpec.reviewer)
      )
    }

    await upsertSprintReviews(runtime, trx, sprint, users)
    await upsertReverseReviewWorkflows(runtime, trx, sprint, users)
  }

  return sprints
}
