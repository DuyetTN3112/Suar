import { test } from '@japa/runner'

import {
  buildPendingApprovalUsersListDTO,
  buildUsersListDTO,
} from '#controllers/users/mappers/request/user_request_mapper'
import {
  mapPendingApprovalUsersApiBody,
  mapProfileViewPageProps,
  mapPublicProfileSnapshotApiBody,
  mapSuccessMessageApiBody,
  mapUserMetadataPageProps,
  mapUsersIndexPageProps,
} from '#controllers/users/mappers/response/user_response_mapper'

function serializable(payload: Record<string, unknown>) {
  return {
    serialize() {
      return payload
    },
  }
}

function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
  }
}

test.group('User controller mappers', () => {
  test('user request mappers normalize pagination and alias filters for adapter layer', ({
    assert,
  }) => {
    const listDto = buildUsersListDTO(
      fakeRequest({
        page: '0',
        limit: '12',
        search: 'duyet',
        system_role: 'superadmin',
        status: 'active',
      }) as never,
      'org-1'
    )

    assert.equal(listDto.pagination.page, 1)
    assert.equal(listDto.pagination.limit, 12)
    assert.equal(listDto.organizationId, 'org-1')
    assert.equal(listDto.filters.search, 'duyet')
    assert.equal(listDto.filters.roleId, 'superadmin')
    assert.equal(listDto.filters.statusId, 'active')
    assert.equal(listDto.filters.excludeStatusId, 'inactive')
    assert.equal(listDto.filters.organizationUserStatus, 'approved')

    const pendingDto = buildPendingApprovalUsersListDTO(
      fakeRequest({
        page: '2',
        limit: '5',
        search: 'pending-user',
      }) as never,
      'org-2'
    )

    assert.equal(pendingDto.pagination.page, 2)
    assert.equal(pendingDto.pagination.limit, 5)
    assert.equal(pendingDto.filters.search, 'pending-user')
    assert.equal(pendingDto.filters.organizationUserStatus, 'pending')
  })

  test('user response mappers normalize page props and preserve public/api envelopes', ({
    assert,
  }) => {
    const user = serializable({
      id: 'user-1',
      username: 'duyet',
      status: 'active',
      trust_data: {
        calculated_score: 88.5,
        current_tier_code: 'organization',
      },
      credibility_data: {
        credibility_score: 67,
      },
      current_organization: {
        id: 'org-1',
        name: 'Suar',
        slug: 'suar',
      },
      skills: [
        serializable({
          id: 'user-skill-1',
          skill_id: 'skill-1',
          level_code: 'senior',
        }),
      ],
    })

    const usersPageProps = mapUsersIndexPageProps(
      {
        data: [user],
        meta: {
          total: 1,
          perPage: 10,
          currentPage: 2,
          lastPage: 3,
        },
      },
      {
        roles: [{ name: 'superadmin' }],
        statuses: [{ name: 'active' }],
      },
      {
        page: 2,
        limit: 10,
        search: 'duyet',
      }
    )

    assert.deepEqual(usersPageProps.metadata, {
      roles: [{ value: 'superadmin', label: 'superadmin' }],
      statuses: [{ value: 'active', label: 'active' }],
    })
    assert.deepEqual(usersPageProps.users.meta, {
      total: 1,
      per_page: 10,
      current_page: 2,
      last_page: 3,
    })
    assert.deepEqual(usersPageProps.users.data[0], {
      id: 'user-1',
      username: 'duyet',
      status: 'active',
      trust_data: {
        calculated_score: 88.5,
        current_tier_code: 'organization',
      },
      credibility_data: {
        credibility_score: 67,
      },
      current_organization: {
        id: 'org-1',
        name: 'Suar',
        slug: 'suar',
      },
      skills: [
        {
          id: 'user-skill-1',
          skill_id: 'skill-1',
          level_code: 'senior',
        },
      ],
    })

    const profileViewProps = mapProfileViewPageProps({
      user,
      completeness: 90,
      spiderChartData: { technical: [], soft_skills: [], delivery: [] },
      deliveryMetrics: {
        delivery: { late_percentage: 0 },
        skill_aggregation: {
          total_skills: 3,
          reviewed_skills: 2,
          avg_percentage: null,
        },
      },
      featuredReviews: [],
      isOwnProfile: false,
    })

    assert.deepEqual(profileViewProps.user.current_organization, {
      id: 'org-1',
      name: 'Suar',
      slug: 'suar',
    })
    assert.deepEqual(profileViewProps.user.skills, [
      {
        id: 'user-skill-1',
        skill_id: 'skill-1',
        level_code: 'senior',
      },
    ])
    assert.equal(profileViewProps.user.status_name, 'active')
    assert.equal(profileViewProps.user.trust_score, 88.5)
    assert.equal(profileViewProps.user.trust_tier_code, 'organization')
    assert.equal(profileViewProps.user.credibility_score, 67)
    assert.deepEqual(
      (
        profileViewProps as {
          deliveryMetrics: {
            delivery: { late_percentage: number }
            skill_aggregation: {
              total_skills: number
              reviewed_skills: number
              avg_percentage: number
            }
          }
        }
      ).deliveryMetrics,
      {
        delivery: { late_percentage: 0 },
        skill_aggregation: {
          total_skills: 3,
          reviewed_skills: 2,
          avg_percentage: 0,
        },
      }
    )

    assert.deepEqual(
      mapUserMetadataPageProps({
        roles: [{ name: 'registered_user' }],
        statuses: [{ value: 'active', label: 'Hoạt động' }],
      }),
      {
        metadata: {
          roles: [{ value: 'registered_user', label: 'registered_user' }],
          statuses: [{ value: 'active', label: 'Hoạt động' }],
        },
      }
    )

    assert.deepEqual(
      mapPublicProfileSnapshotApiBody(
        serializable({
          id: 'snapshot-1',
          shareable_slug: 'duyet-v1',
          shareable_token: 'secret-token',
        })
      ),
      {
        success: true,
        data: {
          id: 'snapshot-1',
          shareable_slug: 'duyet-v1',
        },
      }
    )

    assert.deepEqual(mapPendingApprovalUsersApiBody([{ id: 'user-2', username: 'pending-user' }]), {
      success: true,
      users: [{ id: 'user-2', username: 'pending-user' }],
      meta: {
        total: 1,
        per_page: 1,
        current_page: 1,
        last_page: 1,
      },
    })

    assert.deepEqual(mapSuccessMessageApiBody('Đã phê duyệt'), {
      success: true,
      message: 'Đã phê duyệt',
    })
  })
})
