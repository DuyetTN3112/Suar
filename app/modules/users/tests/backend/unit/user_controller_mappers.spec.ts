import { test } from '@japa/runner'

import {
  buildAddUserSkillDTO,
  buildChangeUserRoleDTO,
  buildPublishUserProfileSnapshotDTO,
  buildRegisterUserDTO,
  buildUpdateProfileSnapshotAccessDTO,
  buildUpdateUserDetailsDTO,
  buildUpdateUserSkillDTO,
  buildPendingApprovalUsersListDTO,
  buildUsersListDTO,
} from '#modules/users/controllers/mappers/request/user_request_mapper'
import {
  mapCurrentProfileSnapshotApiBody,
  mapPendingApprovalCountApiBody,
  mapProfileSnapshotHistoryApiBody,
  mapProfileViewApiBody,
  mapPendingApprovalUsersApiBody,
  mapProfileViewPageProps,
  mapPublicProfileSnapshotApiBody,
  mapRecruiterBookmarkApiBody,
  mapRecruiterBookmarksApiBody,
  mapSnapshotMutationApiBody,
  mapSuccessMessageApiBody,
  mapSystemUsersApiBody,
  mapTalentSearchApiBody,
  mapUserMetadataPageProps,
  mapUsersIndexPageProps,
} from '#modules/users/controllers/mappers/response/user_response_mapper'

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

    const publishDto = buildPublishUserProfileSnapshotDTO(
      fakeRequest({
        snapshotName: 'Public v2',
        isPublic: true,
        expiresInDays: 14,
      }) as never
    )
    assert.equal(publishDto.snapshotName, 'Public v2')
    assert.isTrue(publishDto.isPublic ?? false)
    assert.equal(publishDto.expiresInDays, 14)

    const accessDto = buildUpdateProfileSnapshotAccessDTO(
      fakeRequest({
        isPublic: false,
        expiresInDays: 3,
      }) as never,
      'snapshot-1'
    )
    assert.equal(accessDto.snapshotId, 'snapshot-1')
    assert.isFalse(accessDto.isPublic)
    assert.equal(accessDto.expiresInDays, 3)

    const addSkillDto = buildAddUserSkillDTO(
      fakeRequest({
        skillId: 'skill-1',
        verifiedPublicProficiencyCode: 'l10',
      }) as never
    )
    assert.equal(addSkillDto.skill_id, 'skill-1')
    assert.equal(addSkillDto.verified_public_proficiency_code, 'l10')

    const updateSkillDto = buildUpdateUserSkillDTO(
      fakeRequest({
        verifiedPublicProficiencyCode: 'l7',
      }) as never,
      'user-skill-1'
    )
    assert.equal(updateSkillDto.user_skill_id, 'user-skill-1')
    assert.equal(updateSkillDto.verified_public_proficiency_code, 'l7')

    assert.throws(() =>
      buildAddUserSkillDTO(
        fakeRequest({
          skillId: 'skill-1',
          verifiedPublicProficiencyCode: 'senior',
        }) as never
      )
    )

    assert.throws(() =>
      buildUpdateUserSkillDTO(
        fakeRequest({
          verifiedPublicProficiencyCode: 'junior',
        }) as never,
        'user-skill-1'
      )
    )

    const registerDto = buildRegisterUserDTO(
      fakeRequest({
        username: 'new-user',
        email: 'new@example.com',
        systemRole: 'registered_user',
        status: 'active',
      }) as never
    )

    assert.equal(registerDto.username, 'new-user')
    assert.equal(registerDto.email, 'new@example.com')
    assert.equal(registerDto.roleId, 'registered_user')
    assert.equal(registerDto.statusId, 'active')

    const detailsDto = buildUpdateUserDetailsDTO(
      fakeRequest({
        avatarUrl: 'https://example.com/avatar.png',
        isExternalContributor: true,
        timezone: 'Asia/Ho_Chi_Minh',
      }) as never
    )

    assert.equal(detailsDto.avatar_url, 'https://example.com/avatar.png')
    assert.isTrue(detailsDto.is_external_contributor ?? false)
    assert.equal(detailsDto.timezone, 'Asia/Ho_Chi_Minh')

    const roleDto = buildChangeUserRoleDTO(
      fakeRequest({
        systemRole: 'system_admin',
      }) as never,
      'target-user',
      'changer-user'
    )

    assert.equal(roleDto.targetUserId, 'target-user')
    assert.equal(roleDto.newRoleId, 'system_admin')
    assert.equal(roleDto.changerId, 'changer-user')
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
          verified_public_proficiency_code: 'senior',
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
    assert.deepEqual(usersPageProps.pagination, {
      mode: 'offset',
      total: 1,
      perPage: 10,
      page: 2,
      lastPage: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    })

    const normalizedUsersPageProps = mapUsersIndexPageProps(
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
    assert.deepEqual(
      (profileViewProps as { userSkills: unknown[] }).userSkills,
      [
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
      ]
    )
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
    assert.deepEqual(
      (profileViewProps as { workHistory: unknown }).workHistory,
      {
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
      mapCurrentProfileSnapshotApiBody(
        serializable({
          id: 'snapshot-current',
          user_id: 'user-1',
          snapshot_name: 'Current snapshot',
          is_current: true,
          is_public: false,
          shareable_slug: null,
        })
      ),
      {
        data: {
          id: 'snapshot-current',
          userId: 'user-1',
          snapshotName: 'Current snapshot',
          isCurrent: true,
          isPublic: false,
          shareableSlug: null,
        },
      }
    )

    assert.deepEqual(
      mapProfileSnapshotHistoryApiBody([
        serializable({
          id: 'snapshot-1',
          user_id: 'user-1',
          snapshot_name: 'v1',
          is_current: false,
        }),
      ]),
      {
        data: [
          {
            id: 'snapshot-1',
            userId: 'user-1',
            snapshotName: 'v1',
            isCurrent: false,
          },
        ],
      }
    )

    assert.deepEqual(
      mapProfileViewApiBody({
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
          organizations: [],
          projects: [],
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
            evidence_history: [],
          },
        ],
        isOwnProfile: false,
      }),
      {
        data: {
          user: {
            id: 'user-1',
            username: 'duyet',
            status: 'active',
            trustData: {
              calculatedScore: 88.5,
              currentTierCode: 'organization',
            },
            credibilityData: {
              credibilityScore: 67,
            },
            currentOrganization: {
              id: 'org-1',
              name: 'Suar',
              slug: 'suar',
            },
            skills: [
              {
                id: 'user-skill-1',
                skillId: 'skill-1',
                verifiedPublicProficiencyCode: 'l10',
              },
            ],
            statusName: 'active',
            trustScore: 88.5,
            trustTierCode: 'organization',
            credibilityScore: 67,
          },
          userSkills: [
            {
              id: 'skill-row-1',
              skillId: 'skill-1',
              skillName: 'TypeScript',
              skillCode: 'typescript',
              categoryName: 'technology',
              categoryCode: 'technology',
              verifiedPublicProficiencyCode: 'l8',
              totalReviews: 3,
              avgScore: 84.6,
              avgPercentage: 84.6,
              lastReviewedAt: '2026-07-01T10:00:00.000Z',
              evidenceCount: 2,
              evidenceHistory: [],
            },
          ],
          completeness: 90,
          spiderChartData: { technology: [], engineering: [], softSkills: [], delivery: [] },
          deliveryMetrics: {
            delivery: { latePercentage: 0 },
            skillAggregation: {
              totalSkills: 3,
              reviewedSkills: 2,
              avgPercentage: null,
            },
          },
          featuredReviews: [],
          workHistory: {
            organizations: [],
            projects: [],
          },
          isOwnProfile: false,
        },
      }
    )

    assert.deepEqual(
      mapPublicProfileSnapshotApiBody(
        serializable({
          id: 'snapshot-1',
          shareable_slug: 'duyet-v1',
          shareable_token: 'secret-token',
          snapshot_name: 'Public snapshot',
        })
      ),
      {
        data: {
          id: 'snapshot-1',
          shareableSlug: 'duyet-v1',
          snapshotName: 'Public snapshot',
        },
      }
    )

    assert.deepEqual(mapPendingApprovalUsersApiBody([{ id: 'user-2', username: 'pending-user' }]), {
      data: [{ id: 'user-2', username: 'pending-user' }],
      pagination: {
        mode: 'offset',
        page: 1,
        perPage: 1,
        total: 1,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        nextCursor: null,
        previousCursor: null,
      },
    })

    assert.deepEqual(
      mapSystemUsersApiBody({
        data: [user],
        meta: {
          total: 1,
          perPage: 10,
          currentPage: 1,
          lastPage: 1,
        },
      }),
      {
        data: [
          {
            id: 'user-1',
            username: 'duyet',
            status: 'active',
            trustData: {
              calculatedScore: 88.5,
              currentTierCode: 'organization',
            },
            credibilityData: {
              credibilityScore: 67,
            },
            currentOrganization: {
              id: 'org-1',
              name: 'Suar',
              slug: 'suar',
            },
            skills: [
              {
                id: 'user-skill-1',
                skillId: 'skill-1',
                verifiedPublicProficiencyCode: 'l10',
              },
            ],
          },
        ],
        pagination: {
          mode: 'offset',
          page: 1,
          perPage: 10,
          total: 1,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          nextCursor: null,
          previousCursor: null,
        },
      }
    )

    assert.deepEqual(
      mapSystemUsersApiBody({
        data: [],
        meta: {
          total: 0,
          per_page: 0,
          current_page: 0,
          last_page: 0,
        },
      }).pagination,
      {
        mode: 'offset',
        page: 1,
        perPage: 1,
        total: 0,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
        nextCursor: null,
        previousCursor: null,
      }
    )

    assert.deepEqual(
      mapTalentSearchApiBody([
        {
          id: 'talent-1',
          trust_score: 91,
          custom_headline: 'Strong backend talent',
          reviewed_skills_count: 3,
          imported_skills_count: 1,
          under_dispute_skills_count: 1,
          latest_confidence_signal: 'high',
        },
      ]),
      {
        data: [
          {
            id: 'talent-1',
            trustScore: 91,
            customHeadline: 'Strong backend talent',
            reviewedSkillsCount: 3,
            importedSkillsCount: 1,
            underDisputeSkillsCount: 1,
            latestConfidenceSignal: 'high',
          },
        ],
      }
    )

    assert.deepEqual(
      mapRecruiterBookmarksApiBody([
        {
          id: 'bookmark-1',
          recruiter_user_id: 'user-1',
          talent_user_id: 'talent-1',
          talent_username: 'talent-alpha',
        },
      ]),
      {
        data: [
          {
            id: 'bookmark-1',
            recruiterUserId: 'user-1',
            talentUserId: 'talent-1',
            talentUsername: 'talent-alpha',
          },
        ],
      }
    )

    assert.deepEqual(
      mapRecruiterBookmarkApiBody(
        serializable({
          id: 'bookmark-2',
          recruiter_user_id: 'user-2',
          talent_user_id: 'talent-2',
          notes: 'Strong fit',
        })
      ),
      {
        data: {
          id: 'bookmark-2',
          recruiterUserId: 'user-2',
          talentUserId: 'talent-2',
          notes: 'Strong fit',
        },
      }
    )

    assert.deepEqual(mapPendingApprovalCountApiBody(4), {
      data: {
        count: 4,
      },
    })

    assert.deepEqual(
      mapSnapshotMutationApiBody({
        snapshotId: 'snapshot-1',
        shareableSlug: 'profile-v2',
      }),
      {
        data: {
          snapshotId: 'snapshot-1',
          shareableSlug: 'profile-v2',
        },
      }
    )

    assert.deepEqual(mapSuccessMessageApiBody('Đã phê duyệt'), {
      data: {
        message: 'Đã phê duyệt',
      },
    })
  })
})
