import { test } from '@japa/runner'

import { makeGetUserSkillsQuery, makeGetUsersListQuery } from '#composition/user_action_factory'
import { userProfilePageQueryFactory } from '#composition/user_query_composition'
import RedisCacheStore from '#modules/cache/infra/redis_cache_store'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import { UserPaginationDTO } from '#modules/users/actions/dtos/common/user_action_dtos'
import { GetUserDetailDTO } from '#modules/users/actions/dtos/request/get_user_detail_dto'
import {
  GetUsersListDTO,
  UserFiltersDTO,
} from '#modules/users/actions/dtos/request/get_users_list_dto'
import { GetUserSkillsDTO } from '#modules/users/actions/queries/get_user_skills_query'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory, UserFactory } from '#tests/helpers/factories'

type MutableCacheStore = {
  -readonly [Key in keyof typeof cacheStore]: (typeof cacheStore)[Key]
}

const mutableCacheStore = cacheStore as MutableCacheStore

test.group('Integration | Sensitive user queries bypass Redis', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('detail ignores a stale raw PII key and does not repopulate Redis', async ({ assert }) => {
    const user = await UserFactory.create({ email: 'authoritative@example.test' })
    const legacyKey = `users:detail:${user.id}`
    await RedisCacheStore.set(legacyKey, {
      id: user.id,
      email: 'stale-pii@example.test',
      current_organization_id: 'stale-authorization-context',
    })

    const result = await userProfilePageQueryFactory
      .makeDetail(makeSystemUserActionContext(user.id))
      .handle(new GetUserDetailDTO(user.id))

    assert.equal(result.email, 'authoritative@example.test')
    assert.deepEqual(await RedisCacheStore.get(legacyKey), {
      id: user.id,
      email: 'stale-pii@example.test',
      current_organization_id: 'stale-authorization-context',
    })

    await RedisCacheStore.delete(legacyKey)
    await userProfilePageQueryFactory
      .makeDetail(makeSystemUserActionContext(user.id))
      .handle(new GetUserDetailDTO(user.id))
    const detailCachePage = await cacheStore.scanKeys(`users:detail:${user.id}*`, '0', 100)
    assert.isEmpty(detailCachePage.keys)
  })

  test('skill evidence and full user lists create no Redis projection', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const skills = await makeGetUserSkillsQuery(makeSystemUserActionContext(owner.id)).handle(
      new GetUserSkillsDTO(owner.id)
    )
    const users = await makeGetUsersListQuery(makeSystemUserActionContext(owner.id)).handle(
      new GetUsersListDTO(new UserPaginationDTO(1, 25), org.id, new UserFiltersDTO())
    )

    assert.isArray(skills)
    assert.isAtLeast(users.data.length, 1)
    const skillsCachePage = await cacheStore.scanKeys(
      `users:skills:*:userId:${owner.id}*`,
      '0',
      100
    )
    const usersCachePage = await cacheStore.scanKeys('users:list:*', '0', 100)
    assert.isEmpty(skillsCachePage.keys)
    assert.isEmpty(usersCachePage.keys)
  })

  test('serves all sensitive user reads when cache APIs fail', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const originalRemember = mutableCacheStore.remember
    const originalResolveVersionedKey = mutableCacheStore.resolveVersionedKeyBestEffort
    let cacheCalls = 0

    mutableCacheStore.remember = () => {
      cacheCalls += 1
      return Promise.reject(new Error('simulated cache outage'))
    }
    mutableCacheStore.resolveVersionedKeyBestEffort = () => {
      cacheCalls += 1
      return Promise.reject(new Error('simulated cache outage'))
    }

    try {
      const [detail, skills, users] = await Promise.all([
        userProfilePageQueryFactory
          .makeDetail(makeSystemUserActionContext(owner.id))
          .handle(new GetUserDetailDTO(owner.id)),
        makeGetUserSkillsQuery(makeSystemUserActionContext(owner.id)).handle(
          new GetUserSkillsDTO(owner.id)
        ),
        makeGetUsersListQuery(makeSystemUserActionContext(owner.id)).handle(
          new GetUsersListDTO(new UserPaginationDTO(1, 25), org.id, new UserFiltersDTO())
        ),
      ])

      assert.equal(detail.id, owner.id)
      assert.isArray(skills)
      assert.isAtLeast(users.data.length, 1)
      assert.equal(cacheCalls, 0)
    } finally {
      mutableCacheStore.remember = originalRemember
      mutableCacheStore.resolveVersionedKeyBestEffort = originalResolveVersionedKey
    }
  })
})
