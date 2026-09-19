import { test } from '@japa/runner'

import { serializable } from '../support/user_controller_mappers_test_support.js'

import {
  mapPendingApprovalUsersPageProps,
  mapProfileShowPageProps,
  mapProfileViewPageProps,
  mapUserMetadataPageProps,
} from '#modules/users/controllers/mappers/response/profile/user_response_mapper'

test.group('Unit | User Controller Mappers - Page Props', () => {
  test('user page props mappers normalize inertia props for profile and admin views', ({
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
          verified_public_proficiency_code: 'senior',
        }),
      ],
    })

    const usersPageProps = mapPendingApprovalUsersPageProps(
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
    assert.deepEqual(usersPageProps.pagination, {
      mode: 'offset',
      total: 1,
      perPage: 10,
      page: 2,
      lastPage: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    })

    const normalizedUsersPageProps = mapPendingApprovalUsersPageProps(
      {
        data: [],
        meta: {
          total: 0,
          per_page: 0,
          current_page: 0,
          last_page: 0,
        },
      },
      {},
      {}
    )

    assert.deepEqual(normalizedUsersPageProps.pagination, {
      mode: 'offset',
      total: 0,
      perPage: 1,
      page: 1,
      lastPage: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    })
    assert.deepEqual(usersPageProps.users[0], {
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
          verified_public_proficiency_code: 'senior',
        },
      ],
    })

    const profileViewProps = mapProfileViewPageProps({
      user,
      completeness: 90,
      spiderChartData: { technology: [], engineering: [], soft_skills: [], delivery: [] },
      deliveryMetrics: {
        delivery: { late_percentage: 0 },
        skill_aggregation: {
          total_skills: 3,
          reviewed_skills: 2,
          avg_percentage: null,
        },
      },
      featuredReviews: [],
      workHistory: {
        organizations: [
          {
            org_name: 'Suar',
            org_role: 'org_member',
            joined_at: '2026-01-01',
            status: 'approved',
          },
        ],
        projects: [
          {
            project_name: 'Marketplace',
            org_name: 'Suar',
            project_role: 'project_contributor',
            start_date: '2026-02-01',
            end_date: null,
            visibility: 'public',
          },
        ],
      },
      userSkills: [
        {
          id: 'skill-row-1',
          skill_id: 'skill-1',
          skill_name: 'TypeScript',
          skill_code: 'typescript',
          category_name: 'technology',
          category_code: 'technology',
          verified_public_proficiency_code: 'l8',
          total_reviews: 3,
          avg_score: 84.6,
          avg_percentage: 84.6,
          last_reviewed_at: '2026-07-01T10:00:00.000Z',
          evidence_count: 2,
          evidence_history: [
            {
              task_id: 'task-1',
              task_title: 'Refactor org dashboard',
              completed_at: '2026-06-28T10:00:00.000Z',
              assigned_public_proficiency_code: 'l8',
              reviewer_type: 'manager',
              comment: 'Strong maintainability',
              evidence_links: [],
            },
          ],
        },
      ],
      isOwnProfile: false,
    })

    assert.deepEqual(profileViewProps.user['current_organization'], {
      id: 'org-1',
      name: 'Suar',
      slug: 'suar',
    })
    assert.deepEqual(profileViewProps.user['skills'], [
      {
        id: 'user-skill-1',
        skill_id: 'skill-1',
        verified_public_proficiency_code: 'senior',
      },
    ])
    assert.equal(profileViewProps.user['status_name'], 'active')
    assert.equal(profileViewProps.user['trust_score'], 88.5)
    assert.equal(profileViewProps.user['trust_tier_code'], 'organization')
    assert.equal(profileViewProps.user['credibility_score'], 67)
    assert.deepEqual((profileViewProps as { userSkills: unknown[] }).userSkills, [
      {
        id: 'skill-row-1',
        skill_id: 'skill-1',
        skill_name: 'TypeScript',
        skill_code: 'typescript',
        category_name: 'technology',
        category_code: 'technology',
        verified_public_proficiency_code: 'l8',
        total_reviews: 3,
        avg_score: 84.6,
        avg_percentage: 84.6,
        last_reviewed_at: '2026-07-01T10:00:00.000Z',
        evidence_count: 2,
        evidence_history: [
          {
            task_id: 'task-1',
            task_title: 'Refactor org dashboard',
            completed_at: '2026-06-28T10:00:00.000Z',
            assigned_public_proficiency_code: 'l8',
            reviewer_type: 'manager',
            comment: 'Strong maintainability',
            evidence_links: [],
          },
        ],
      },
    ])
    assert.deepEqual(
      (
        profileViewProps as {
          deliveryMetrics: {
            delivery: { late_percentage: number }
            skill_aggregation: {
              total_skills: number
              reviewed_skills: number
              avg_percentage: number | null
            }
          }
        }
      ).deliveryMetrics,
      {
        delivery: { late_percentage: 0 },
        skill_aggregation: {
          total_skills: 3,
          reviewed_skills: 2,
          avg_percentage: null,
        },
      }
    )
    assert.deepEqual((profileViewProps as { workHistory: unknown }).workHistory, {
      organizations: [
        {
          org_name: 'Suar',
          org_role: 'org_member',
          joined_at: '2026-01-01',
          status: 'approved',
        },
      ],
      projects: [
        {
          project_name: 'Marketplace',
          org_name: 'Suar',
          project_role: 'project_contributor',
          start_date: '2026-02-01',
          end_date: null,
          visibility: 'public',
        },
      ],
    })

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

    const profileShowProps = mapProfileShowPageProps({
      user: serializable({ id: 'user-1' }),
      userSkills: [],
      completeness: 0,
      spiderChartData: {},
      deliveryMetrics: {},
      featuredReviews: [],
      reviewHistory: [],
      workHistory: [],
      currentSnapshot: serializable({
        id: 'snapshot-private-page',
        user_id: 'user-1',
        snapshot_name: 'Private page snapshot',
        is_current: true,
        is_public: false,
        shareable_slug: 'private-page-slug',
        shareable_token: 'private-page-token',
      }),
    })

    assert.deepEqual(profileShowProps.currentSnapshot, {
      id: 'snapshot-private-page',
      user_id: 'user-1',
      snapshot_name: 'Private page snapshot',
      is_current: true,
      is_public: false,
      shareable_slug: 'private-page-slug',
    })
  })
})
