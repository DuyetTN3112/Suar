import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { taskExternalDeps } from '#composition/task_external_dependencies_composition'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { PublicTaskSearchCandidateReader } from '#modules/tasks/actions/ports/outbound/task_search_candidate_readers'
import GetPublicTasksQuery from '#modules/tasks/actions/queries/get_public_tasks_query'
import GetTasksListQuery from '#modules/tasks/actions/queries/get_tasks_list_query'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { LucidTaskReadRepository } from '#modules/tasks/infra/adapters/lucid_task_read_repository'
import * as publicQueries from '#modules/tasks/infra/repositories/read/public_queries'

interface TaskQueryFactoryDependencies {
  externalDependencies: TaskExternalDependencies
  publicTaskSearchCandidates: PublicTaskSearchCandidateReader
}

const taskReadRepository = new LucidTaskReadRepository()

export function createTaskQueryFactory({
  externalDependencies,
  publicTaskSearchCandidates,
}: TaskQueryFactoryDependencies) {
  return {
    makeGetPublicTasksQuery(execCtx: TaskActionContext): GetPublicTasksQuery {
      return new GetPublicTasksQuery(execCtx, {
        searchCandidateReader: publicTaskSearchCandidates,
        resolveSkillIdsByCategoryCodes: (categoryCodes) =>
          externalDependencies.skill.resolveSkillIdsByCategoryCodes(categoryCodes),
        paginatePublicTasksAsRecords: (filters, userId, trx) =>
          publicQueries.paginatePublicTasksAsRecords(
            filters,
            userId,
            trx as TransactionClientContract | undefined,
            externalDependencies.skill,
            externalDependencies.user,
            externalDependencies.org,
            externalDependencies.project
          ),
      })
    },

    makeGetTasksListQuery(execCtx: TaskActionContext): GetTasksListQuery {
      return new GetTasksListQuery(execCtx, externalDependencies, taskReadRepository, {
        searchCandidateReader: externalDependencies.organizationTaskSearchCandidates,
      })
    },
  }
}

const unavailablePublicTaskSearchCandidates: PublicTaskSearchCandidateReader = {
  isEnabled: () => false,
  searchPublicTaskCandidates: () => Promise.resolve([]),
}

const defaultTaskQueryFactory = createTaskQueryFactory({
  externalDependencies: taskExternalDeps,
  publicTaskSearchCandidates: unavailablePublicTaskSearchCandidates,
})

export function makeGetPublicTasksQuery(execCtx: TaskActionContext): GetPublicTasksQuery {
  return defaultTaskQueryFactory.makeGetPublicTasksQuery(execCtx)
}

export function makeGetTasksListQuery(
  execCtx: TaskActionContext,
  externalDependencies: TaskExternalDependencies = taskExternalDeps
): GetTasksListQuery {
  return new GetTasksListQuery(execCtx, externalDependencies, taskReadRepository, {
    searchCandidateReader: externalDependencies.organizationTaskSearchCandidates,
  })
}
