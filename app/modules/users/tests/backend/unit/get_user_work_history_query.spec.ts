import { test } from '@japa/runner'

import { CACHE_COLLECTION_GENERATION_NAMESPACES } from '#modules/cache/public_contracts/cache_contract'
import type {
  UserWorkHistoryReader,
  UserWorkHistoryViewerScope,
} from '#modules/users/actions/ports/outbound/user_work_history_reader'
import GetUserWorkHistoryQuery, {
  GetUserWorkHistoryDTO,
} from '#modules/users/actions/queries/get_user_work_history_query'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'

class InspectableGetUserWorkHistoryQuery extends GetUserWorkHistoryQuery {
  cacheKey: string | null = null
  logicalCacheKey: string | null = null
  generationNamespaces: readonly string[] = []

  protected override resolveVersionedCacheKey(
    namespaces: readonly string[],
    logicalKey: string
  ): Promise<string | null> {
    this.generationNamespaces = namespaces
    this.logicalCacheKey = logicalKey
    return Promise.resolve(`physical:${logicalKey}`)
  }

  protected override async executeWithCache<T>(
    cacheKey: string,
    _ttl: number,
    callback: () => Promise<T>
  ): Promise<T> {
    this.cacheKey = cacheKey
    return callback()
  }
}

class CacheUnavailableGetUserWorkHistoryQuery extends GetUserWorkHistoryQuery {
  protected override resolveVersionedCacheKey(): Promise<null> {
    return Promise.resolve(null)
  }

  protected override executeWithCache<T>(): Promise<T> {
    throw new Error('Cache must be bypassed when generation resolution is unavailable')
  }
}

function makeReader(scopes: UserWorkHistoryViewerScope[]): UserWorkHistoryReader {
  return {
    listOrganizationMemberships() {
      return Promise.resolve([
        {
          organization_id: 'org-1',
          organization_name: 'Suar',
          org_role: 'org_member',
          joined_at: new Date('2026-01-01T00:00:00.000Z'),
          status: 'approved',
        },
      ])
    },
    listProjectMemberships(_userId, viewerScope) {
      scopes.push(viewerScope)
      return Promise.resolve([
        {
          project_name: 'Provider-owned project',
          organization_id: 'org-1',
          project_role: 'project_member',
          start_date: null,
          end_date: null,
          visibility: viewerScope === 'self' ? 'private' : 'public',
        },
      ])
    },
    listOrganizationNamesByIds(organizationIds) {
      return Promise.resolve(organizationIds.map((id) => ({ id, name: 'Suar' })))
    },
  }
}

test.group('Get user work history query', () => {
  test('partitions cache and provider visibility by viewer scope', async ({ assert }) => {
    const scopes: UserWorkHistoryViewerScope[] = []
    const reader = makeReader(scopes)
    const subjectId = 'user-subject'
    const dto = new GetUserWorkHistoryDTO(subjectId)
    const selfQuery = new InspectableGetUserWorkHistoryQuery(
      makeSystemUserActionContext(subjectId),
      reader
    )
    const publicQuery = new InspectableGetUserWorkHistoryQuery(
      makeSystemUserActionContext('user-viewer'),
      reader
    )

    const selfResult = await selfQuery.handle(dto)
    const publicResult = await publicQuery.handle(dto)

    assert.deepEqual(scopes, ['self', 'public'])
    assert.equal(selfQuery.logicalCacheKey, 'users:work_history:user-subject:self')
    assert.equal(publicQuery.logicalCacheKey, 'users:work_history:user-subject:public')
    assert.equal(selfQuery.cacheKey, 'physical:users:work_history:user-subject:self')
    assert.equal(publicQuery.cacheKey, 'physical:users:work_history:user-subject:public')
    assert.deepEqual(selfQuery.generationNamespaces, [
      CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory,
      `${CACHE_COLLECTION_GENERATION_NAMESPACES.userWorkHistory}:user:${subjectId}`,
    ])
    assert.equal(selfResult.projects[0]?.visibility, 'private')
    assert.equal(publicResult.projects[0]?.visibility, 'public')
    assert.equal(publicResult.projects[0]?.org_name, 'Suar')
    assert.deepEqual(
      publicResult.organizations.map((organization) => organization.org_name),
      ['Suar']
    )
  })

  test('loads the source without cache when generation resolution is unavailable', async ({
    assert,
  }) => {
    const scopes: UserWorkHistoryViewerScope[] = []
    const result = await new CacheUnavailableGetUserWorkHistoryQuery(
      makeSystemUserActionContext('viewer-1'),
      makeReader(scopes)
    ).handle(new GetUserWorkHistoryDTO('subject-1'))

    assert.deepEqual(scopes, ['public'])
    assert.equal(result.projects[0]?.project_name, 'Provider-owned project')
  })
})
