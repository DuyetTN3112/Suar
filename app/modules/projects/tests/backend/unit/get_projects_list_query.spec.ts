import { test } from '@japa/runner'

import type { ProjectListRepository } from '#modules/projects/actions/ports/outbound/project_list_repository'
import { ProjectMembershipRepository } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import type { ProjectSearchCandidateReader } from '#modules/projects/actions/ports/outbound/project_search_candidate_reader'
import type { ProjectTaskStatsReader } from '#modules/projects/actions/ports/outbound/project_task_stats_reader'
import { makeSystemProjectActionContext } from '#modules/projects/actions/project_action_context'
import GetProjectsListQuery from '#modules/projects/actions/queries/get_projects_list_query'

type ProjectListFilters = Parameters<
  NonNullable<ConstructorParameters<typeof GetProjectsListQuery>[2]>['paginateByUserAccess']
>[1]

class ProjectMembershipStub extends ProjectMembershipRepository {
  findMember() {
    return Promise.resolve(null)
  }
  getRoleName() {
    return Promise.resolve('')
  }
  listMemberUserIds() {
    return Promise.resolve([])
  }
  listMembers() {
    return Promise.resolve({ data: [], total: 0 })
  }
  hasAccess() {
    return Promise.resolve(false)
  }
  countByProjectIds() {
    return Promise.resolve(new Map<string, number>())
  }
  addMember() {
    return Promise.resolve()
  }
  updateRole() {
    return Promise.resolve()
  }
  deleteMember() {
    return Promise.resolve()
  }
}

test.group('Unit | Get Projects List Query', () => {
  test('uses engine project ids and clears SQL search when engine returns hits', async ({
    assert,
  }) => {
    const calls: string[] = []
    const taskCounter: ProjectTaskStatsReader = {
      getTaskStats: (projectId) =>
        Promise.resolve({
          projectId,
          totalTasks: 0,
          incompleteTasks: 0,
          completedTasks: 0,
          pendingReviewSessions: 0,
        }),
      countTasksByProjectIds: () => Promise.resolve(new Map()),
      countTasksByAssignees: () => Promise.resolve(new Map()),
    }
    const repository: ProjectListRepository = {
      paginateByUserAccess: (userId: string, filters: ProjectListFilters) => {
        calls.push(`repo:list:${JSON.stringify({ userId, filters })}`)
        return Promise.resolve({ data: [], total: 0 })
      },
      getStatsByUserAccess: () => Promise.resolve({
        total_projects: 0,
        active_projects: 0,
        completed_projects: 0,
      }),
    }
    const memberships = new ProjectMembershipStub()
    const searchCandidateReader: ProjectSearchCandidateReader = {
      isEnabled: () => true,
      searchProjectCandidates: ({ q, limit }: { q: string; limit: number }) => {
        calls.push(`engine:${q}:${limit}`)
        return Promise.resolve([{ projectId: 'project-2' }, { projectId: 'project-1' }])
      },
    }

    const query = new GetProjectsListQuery(
      makeSystemProjectActionContext('owner-user'),
      taskCounter,
      repository,
      memberships,
      searchCandidateReader
    )

    await query.handle({
      page: 2,
      limit: 10,
      search: 'elastic',
      status: 'active',
    })

    assert.deepEqual(calls, [
      'engine:elastic:20',
      'repo:list:{"userId":"owner-user","filters":{"page":2,"limit":10,"project_ids":["project-2","project-1"],"status":"active"}}',
    ])
  })
})
