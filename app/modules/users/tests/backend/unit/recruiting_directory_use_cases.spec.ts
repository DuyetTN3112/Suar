import { test } from '@japa/runner'

import GetRecruitingTalentDirectoryWorkspaceQuery from '#modules/users/actions/queries/recruiting/get_recruiting_talent_directory_workspace_query'
import GetRecruitingTalentProfileQuery from '#modules/users/actions/queries/recruiting/get_recruiting_talent_profile_query'
import SearchRecruitingTalentsQuery from '#modules/users/actions/queries/search/search_recruiting_talents_query'
import type { UserRecruitingAccessReader } from '#modules/users/actions/ports/outbound/user_recruiting_access_reader'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

const context: UserActionContext = {
  userId: 'actor-1',
  organizationId: 'organization-1',
  ip: '127.0.0.1',
  userAgent: 'test',
}

function accessReader(
  input: {
    canAccess?: boolean
    talentBelongs?: boolean
  } = {}
): UserRecruitingAccessReader {
  return {
    canAccessDirectory: () => Promise.resolve(input.canAccess ?? true),
    talentBelongsToOrganization: () => Promise.resolve(input.talentBelongs ?? true),
  }
}

test.group('Unit | Recruiting directory use cases', () => {
  test('authorized search owns access before delegating to generic search', async ({ assert }) => {
    let searchCalls = 0
    const query = new SearchRecruitingTalentsQuery(context, accessReader(), {
      handle: () => {
        searchCalls += 1
        return Promise.resolve([])
      },
    })

    assert.deepEqual(await query.handle({ q: 'architect' }), [])
    assert.equal(searchCalls, 1)
  })

  test('denied search never invokes the generic search capability', async ({ assert }) => {
    let searchCalls = 0
    const query = new SearchRecruitingTalentsQuery(context, accessReader({ canAccess: false }), {
      handle: () => {
        searchCalls += 1
        return Promise.resolve([])
      },
    })

    await assert.rejects(() => query.handle({}), /Bạn không có quyền truy cập danh bạ talent/)
    assert.equal(searchCalls, 0)
  })

  test('directory workspace owns page and options orchestration after authorization', async ({
    assert,
  }) => {
    const calls: string[] = []
    const query = new GetRecruitingTalentDirectoryWorkspaceQuery(
      context,
      accessReader(),
      {
        handle: () => {
          calls.push('directory')
          return Promise.resolve({ talents: [] } as never)
        },
      },
      {
        execute: (organizationId) => {
          calls.push(`options:${organizationId}`)
          return Promise.resolve({ availableSkills: [], availableTasks: [] })
        },
      }
    )

    const result = await query.handle({})
    assert.deepEqual(calls.sort(), ['directory', 'options:organization-1'])
    assert.deepEqual(result.talents, [])
    assert.deepEqual(result.availableSkills, [])
  })

  test('talent profile checks organization membership before loading profile', async ({
    assert,
  }) => {
    let profileCalls = 0
    const query = new GetRecruitingTalentProfileQuery(
      context,
      accessReader({ talentBelongs: false }),
      {
        execute: () => {
          profileCalls += 1
          return Promise.resolve({} as never)
        },
      }
    )

    await assert.rejects(
      () => query.handle({ userId: 'talent-1' }),
      /Bạn không có quyền truy cập danh bạ talent/
    )
    assert.equal(profileCalls, 0)
  })
})
