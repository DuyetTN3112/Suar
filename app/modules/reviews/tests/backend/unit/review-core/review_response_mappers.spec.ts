import { test } from '@japa/runner'

import { serializable } from '../support/review_controller_mappers_test_support.js'

import {
  mapCreateReviewSessionApiBody,
  mapFlaggedReviewsPageProps,
  mapMyReviewsPageProps,
  mapPendingReviewsPageProps,
  mapReviewDataApiBody,
  mapReviewCollectionApiBody,
  mapReviewDisputeEvidenceApiBody,
  mapReviewEvidenceCollectionApiBody,
  mapShowReviewPageProps,
  mapTaskSelfAssessmentApiBody,
  mapUserReviewsPageProps,
} from '#modules/reviews/controllers/mappers/response/review-core/review_response_mapper'

test.group('Unit | Review Controller Mappers - Response & Page Props', () => {
  test('review page mappers serialize controller results into stable page props', ({ assert }) => {
    const result = {
      data: [serializable({ id: 'session-1', status: 'completed' })],
      meta: {
        total: 1,
        per_page: 10,
        current_page: 1,
        last_page: 1,
      },
    }

    assert.deepEqual(mapMyReviewsPageProps(result), {
      reviews: [{ id: 'session-1', status: 'completed' }],
      pagination: {
        mode: 'offset',
        page: 1,
        perPage: 10,
        total: 1,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })
    assert.deepEqual(mapUserReviewsPageProps(result, 'user-1'), {
      userId: 'user-1',
      reviews: [{ id: 'session-1', status: 'completed' }],
      pagination: {
        mode: 'offset',
        page: 1,
        perPage: 10,
        total: 1,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })
    assert.deepEqual(mapPendingReviewsPageProps(result), {
      reviews: [{ id: 'session-1', status: 'completed' }],
      pagination: {
        mode: 'offset',
        page: 1,
        perPage: 10,
        total: 1,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })
    assert.deepEqual(
      mapShowReviewPageProps(
        serializable({ id: 'session-1', manager_review_completed: true }),
        [{ id: 'skill-1', skill_name: 'TypeScript' }],
        ['junior', 'senior'],
        null,
        [
          {
            id: 'comment-1',
            taskId: 'task-1',
            parentCommentId: null,
            authorId: 'user-1',
            authorUsername: 'duyet',
            body: 'Need benchmark evidence',
            commentType: 'review_note',
            visibility: 'internal',
            reviewRelevance: true,
            editedAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            mentions: [],
          },
        ]
      ),
      {
        session: { id: 'session-1', manager_review_completed: true },
        skills: [{ id: 'skill-1', skill_name: 'TypeScript' }],
        proficiencyLevels: ['junior', 'senior'],
        disputeId: null,
        taskComments: [
          {
            id: 'comment-1',
            taskId: 'task-1',
            parentCommentId: null,
            authorId: 'user-1',
            authorUsername: 'duyet',
            body: 'Need benchmark evidence',
            commentType: 'review_note',
            visibility: 'internal',
            reviewRelevance: true,
            editedAt: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            mentions: [],
          },
        ],
      }
    )
    assert.deepEqual(
      mapFlaggedReviewsPageProps(
        {
          data: [serializable({ id: 'flag-1', status: 'pending' })],
          meta: result.meta,
        },
        ['pending', 'dismissed'],
        'pending'
      ),
      {
        reviews: [{ id: 'flag-1', status: 'pending' }],
        pagination: {
          mode: 'offset',
          page: 1,
          perPage: 10,
          total: 1,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        statuses: ['pending', 'dismissed'],
        currentStatus: 'pending',
      }
    )
  })

  test('review api mappers serialize model payloads and preserve response envelopes', ({
    assert,
  }) => {
    assert.deepEqual(
      mapCreateReviewSessionApiBody(
        serializable({
          id: 'session-1',
          task_assignment_id: 'assignment-1',
          reviewee_id: 'user-1',
          status: 'pending',
          manager_review_completed: false,
          peer_reviews_count: 0,
          required_peer_reviews: 2,
          confirmations: [],
          overall_quality_score: null,
          delivery_timeliness: null,
          requirement_adherence: null,
          communication_quality: null,
          code_quality_score: null,
          proactiveness_score: null,
          would_work_with_again: null,
          strengths_observed: null,
          areas_for_improvement: null,
          deadline: '2026-01-02T00:00:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          completed_at: null,
          updated_at: '2026-01-01T00:00:00.000Z',
        })
      ),
      {
        data: {
          id: 'session-1',
          taskAssignmentId: 'assignment-1',
          revieweeId: 'user-1',
          status: 'pending',
          creatorReviewCompleted: null,
          creatorReviewerId: null,
          managerReviewCompleted: false,
          managerReviewsCount: null,
          minimumManagerReviews: null,
          minimumPeerReviews: null,
          peerReviewsCount: 0,
          requiredPeerReviews: 2,
          requiredTotalReviews: null,
          confirmations: [],
          overallQualityScore: null,
          deliveryTimeliness: null,
          requirementAdherence: null,
          communicationQuality: null,
          codeQualityScore: null,
          proactivenessScore: null,
          wouldWorkWithAgain: null,
          strengthsObserved: null,
          areasForImprovement: null,
          deadline: '2026-01-02T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
          completedAt: null,
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      }
    )
    assert.deepEqual(
      mapReviewDataApiBody(
        serializable({
          id: 'evidence-1',
          dispute_id: 'dispute-1',
          request_payload: {
            case_file_id: 'case-file-1',
            reviewer_context: { system_role: 'system_admin' },
          },
        })
      ),
      {
        data: {
          id: 'evidence-1',
          disputeId: 'dispute-1',
          requestPayload: {
            caseFileId: 'case-file-1',
            reviewerContext: { systemRole: 'system_admin' },
          },
        },
      }
    )
    assert.deepEqual(
      mapReviewCollectionApiBody([
        serializable({
          id: 'reverse-1',
          review_session_id: 'session-1',
          reviewer_id: 'user-1',
          target_type: 'manager',
          request_payload: {
            case_id: 'dispute-1',
            reviewer_context: { system_role: 'system_admin' },
          },
        }),
      ]),
      {
        data: [
          {
            id: 'reverse-1',
            reviewSessionId: 'session-1',
            reviewerId: 'user-1',
            targetType: 'manager',
            requestPayload: {
              caseId: 'dispute-1',
              reviewerContext: { systemRole: 'system_admin' },
            },
          },
        ],
      }
    )
    assert.deepEqual(
      mapReviewCollectionApiBody(
        [
          serializable({
            id: 'reverse-1',
            review_session_id: 'session-1',
          }),
        ],
        {
          total: 25,
          per_page: 10,
          current_page: 1,
          last_page: 3,
          cursor: {
            next_cursor: 'cursor-older',
            previous_cursor: null,
            has_next_page: true,
            has_previous_page: false,
          },
        }
      ),
      {
        data: [
          {
            id: 'reverse-1',
            reviewSessionId: 'session-1',
          },
        ],
        pagination: {
          mode: 'cursor',
          page: 1,
          perPage: 10,
          total: 25,
          lastPage: 3,
          hasNextPage: true,
          hasPreviousPage: false,
          nextCursor: 'cursor-older',
          previousCursor: null,
        },
      }
    )
    assert.deepEqual(
      mapReviewDisputeEvidenceApiBody(
        serializable({
          id: 'evidence-1',
          dispute_id: 'dispute-1',
          uploaded_by: 'user-1',
          uploader_context: 'org_owner',
          uploader_system_role: null,
          evidence_type: 'document_link',
          url: 'https://example.com',
          title: 'Spec',
          description: 'Details',
          created_at: '2026-01-01T00:00:00.000Z',
        })
      ),
      {
        data: {
          id: 'evidence-1',
          reviewSessionId: null,
          disputeId: 'dispute-1',
          uploaderId: 'user-1',
          uploadedBy: 'user-1',
          uploaderContext: 'org_owner',
          uploaderSystemRole: null,
          evidenceType: 'document_link',
          url: 'https://example.com',
          title: 'Spec',
          description: 'Details',
          origin: null,
          origins: null,
          verificationStatus: null,
          isSensitive: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: null,
        },
      }
    )
    assert.deepEqual(
      mapReviewEvidenceCollectionApiBody([
        serializable({ id: 'evidence-1', evidence_type: 'document_link' }),
        { id: 'evidence-2', evidence_type: 'screenshot' },
      ]),
      {
        data: [
          {
            id: 'evidence-1',
            reviewSessionId: null,
            disputeId: null,
            uploaderId: null,
            uploadedBy: null,
            uploaderContext: null,
            uploaderSystemRole: null,
            evidenceType: 'document_link',
            url: null,
            title: null,
            description: null,
            origin: null,
            origins: null,
            verificationStatus: null,
            isSensitive: null,
            createdAt: null,
            updatedAt: null,
          },
          {
            id: 'evidence-2',
            reviewSessionId: null,
            disputeId: null,
            uploaderId: null,
            uploadedBy: null,
            uploaderContext: null,
            uploaderSystemRole: null,
            evidenceType: 'screenshot',
            url: null,
            title: null,
            description: null,
            origin: null,
            origins: null,
            verificationStatus: null,
            isSensitive: null,
            createdAt: null,
            updatedAt: null,
          },
        ],
      }
    )
    assert.deepEqual(
      mapTaskSelfAssessmentApiBody(
        serializable({
          id: 'assessment-1',
          task_assignment_id: 'assignment-1',
          user_id: 'user-1',
          overall_satisfaction: 5,
          difficulty_felt: 'as_expected',
          confidence_level: 4,
          what_went_well: 'Clear scope',
          what_would_do_different: 'Add benchmarks',
          blockers_encountered: ['none'],
          skills_felt_lacking: ['design'],
          skills_felt_strong: ['typescript'],
          submitted_at: '2026-01-01T00:00:00.000Z',
        })
      ),
      {
        data: {
          id: 'assessment-1',
          taskAssignmentId: 'assignment-1',
          userId: 'user-1',
          overallSatisfaction: 5,
          difficultyFelt: 'as_expected',
          confidenceLevel: 4,
          whatWentWell: 'Clear scope',
          whatWouldDoDifferent: 'Add benchmarks',
          blockersEncountered: ['none'],
          skillsFeltLacking: ['design'],
          skillsFeltStrong: ['typescript'],
          submittedAt: '2026-01-01T00:00:00.000Z',
        },
      }
    )
    assert.deepEqual(mapTaskSelfAssessmentApiBody(null), {
      data: null,
    })
  })
})
