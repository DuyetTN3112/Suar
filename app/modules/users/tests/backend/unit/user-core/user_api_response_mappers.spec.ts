import { test } from '@japa/runner'

import { serializable } from '../support/user_controller_mappers_test_support.js'

import {
  mapCurrentProfileSnapshotApiBody,
  mapPendingApprovalCountApiBody,
  mapPendingApprovalUsersApiBody,
  mapProfileSnapshotHistoryApiBody,
  mapProfileViewApiBody,
  mapPublicProfileSnapshotApiBody,
  mapRecruiterBookmarkApiBody,
  mapRecruiterBookmarksApiBody,
  mapSnapshotMutationApiBody,
  mapSuccessMessageApiBody,
  mapSystemUsersApiBody,
  mapTalentSearchApiBody,
} from '#modules/users/controllers/mappers/response/profile/user_response_mapper'

test.group('Unit | User Controller Mappers - API Responses', () => {
  test('user api mappers serialize domain models and preserve standard response envelopes', ({
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

    assert.deepEqual(
      mapCurrentProfileSnapshotApiBody(
        serializable({
          id: 'snapshot-current',
          user_id: 'user-1',
          snapshot_name: 'Current snapshot',
          is_current: true,
          is_public: false,
          shareable_slug: null,
          shareable_token: 'private-token',
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
      mapCurrentProfileSnapshotApiBody(
        serializable({
          id: 'snapshot-public',
          user_id: 'user-1',
          snapshot_name: 'Public snapshot',
          is_current: true,
          is_public: true,
          shareable_slug: 'public-slug',
          shareable_token: 'public-token',
        })
      ),
      {
        data: {
          id: 'snapshot-public',
          userId: 'user-1',
          snapshotName: 'Public snapshot',
          isCurrent: true,
          isPublic: true,
          shareableSlug: 'public-slug',
          shareableToken: 'public-token',
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
