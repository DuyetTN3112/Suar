import { test } from '@japa/runner'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import {
  buildAddReviewEvidenceDTO,
  buildConfirmReviewDTO,
  buildCreateReviewDisputeDTO,
  buildCreateReviewSessionDTO,
  buildFlaggedReviewsInput,
  buildGetUserReviewsDTO,
  buildPendingReviewsInput,
  buildResolveReviewDisputeDTO,
  buildStartAiDisputeEvaluationDTO,
  buildSubmitSkillReviewDTO,
  buildSubmitReverseReviewDTO,
} from '#modules/reviews/controllers/mappers/request/review-core/review_request_mapper'
import {
  mapCreateReviewSessionApiBody,
  mapFlaggedReviewsPageProps,
  mapMyReviewsPageProps,
  mapPendingReviewsPageProps,
  mapReviewDataApiBody,
  mapReviewCollectionApiBody,
  mapReviewDisputeCommentApiBody,
  mapReviewDisputeEvidenceApiBody,
  mapReviewEvidenceCollectionApiBody,
  mapShowReviewPageProps,
  mapTaskSelfAssessmentApiBody,
  mapUserReviewsPageProps,
} from '#modules/reviews/controllers/mappers/response/review-core/review_response_mapper'

const VALID_REVIEW_SESSION_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_SKILL_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

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


test.group('', () => {
  test('create review session request mapper accepts camelCase and snake_case inputs', ({
    assert,
  }) => {
    const camelCaseDto = buildCreateReviewSessionDTO(
      fakeRequest({
        taskAssignmentId: 'assignment-1',
        revieweeId: 'user-1',
        requiredPeerReviews: 4,
      }) as never
    )

    assert.equal(camelCaseDto.task_assignment_id, 'assignment-1')
    assert.equal(camelCaseDto.reviewee_id, 'user-1')
    assert.equal(camelCaseDto.required_peer_reviews, 4)

    const snakeCaseDto = buildCreateReviewSessionDTO(
      fakeRequest({
        task_assignment_id: 'assignment-2',
        reviewee_id: 'user-2',
        required_peer_reviews: 3,
      }) as never
    )

    assert.equal(snakeCaseDto.task_assignment_id, 'assignment-2')
    assert.equal(snakeCaseDto.reviewee_id, 'user-2')
    assert.equal(snakeCaseDto.required_peer_reviews, 3)
  })

  test('review list request mappers normalize shared pagination and preserve cursor filters', ({
    assert,
  }) => {
    const userReviewsDto = buildGetUserReviewsDTO(
      fakeRequest({
        page: '0',
        per_page: '999',
      }) as never,
      'user-1'
    )
    const pendingInput = buildPendingReviewsInput(
      fakeRequest({
        page: '0',
        per_page: '999',
      }) as never
    )
    const pendingCursorInput = buildPendingReviewsInput(
      fakeRequest({
        page: '0',
        per_page: '999',
        after: 'cursor-older',
        before: 'cursor-newer',
      }) as never
    )
    const flaggedInput = buildFlaggedReviewsInput(
      fakeRequest({
        page: '0',
        per_page: '999',
        after: 'cursor-older',
        before: 'cursor-newer',
        status: 'pending',
      }) as never
    )

    assert.equal(userReviewsDto.user_id, 'user-1')
    assert.equal(userReviewsDto.page, 1)
    assert.equal(userReviewsDto.per_page, 100)
    assert.deepEqual(pendingInput, {
      page: 1,
      per_page: 100,
    })
    assert.deepEqual(pendingCursorInput, {
      page: 1,
      per_page: 100,
      after: 'cursor-older',
      before: 'cursor-newer',
    })
    assert.deepEqual(flaggedInput, {
      page: 1,
      per_page: 100,
      after: 'cursor-older',
      before: 'cursor-newer',
      status: 'pending',
    })
  })

  test('review list request mappers accept camelCase perPage alias', ({ assert }) => {
    const userReviewsDto = buildGetUserReviewsDTO(
      fakeRequest({
        page: '2',
        perPage: '25',
      }) as never,
      'user-1'
    )
    const pendingInput = buildPendingReviewsInput(
      fakeRequest({
        page: '3',
        perPage: '40',
      }) as never
    )
    const flaggedInput = buildFlaggedReviewsInput(
      fakeRequest({
        page: '4',
        perPage: '50',
        status: 'resolved',
      }) as never
    )

    assert.equal(userReviewsDto.page, 2)
    assert.equal(userReviewsDto.per_page, 25)
    assert.deepEqual(pendingInput, {
      page: 3,
      per_page: 40,
    })
    assert.deepEqual(flaggedInput, {
      page: 4,
      per_page: 50,
      status: 'resolved',
    })
  })

  test('create review dispute request mapper accepts camelCase and snake_case inputs', ({
    assert,
  }) => {
    const camelCaseDto = buildCreateReviewDisputeDTO(
      fakeRequest({
        reviewSessionId: 'session-1',
        disputeReason: 'Need second opinion',
        disputedDimensions: { quality: true },
        disputedSkillReviews: [{ skillId: 'skill-1' }],
        requestedOutcome: 'adjust_score',
      }) as never
    )

    assert.equal(camelCaseDto.review_session_id, 'session-1')
    assert.equal(camelCaseDto.dispute_reason, 'Need second opinion')
    assert.deepEqual(camelCaseDto.disputed_dimensions, { quality: true })
    assert.deepEqual(camelCaseDto.disputed_skill_reviews, [{ skillId: 'skill-1' }])
    assert.equal(camelCaseDto.requested_outcome, 'adjust_score')

    const snakeCaseDto = buildCreateReviewDisputeDTO(
      fakeRequest({
        review_session_id: 'session-2',
        dispute_reason: 'Need escalation',
        disputed_dimensions: { timeliness: true },
        disputed_skill_reviews: [{ skill_id: 'skill-2' }],
        requested_outcome: 'request_re_review',
      }) as never
    )

    assert.equal(snakeCaseDto.review_session_id, 'session-2')
    assert.equal(snakeCaseDto.dispute_reason, 'Need escalation')
    assert.deepEqual(snakeCaseDto.disputed_dimensions, { timeliness: true })
    assert.deepEqual(snakeCaseDto.disputed_skill_reviews, [{ skill_id: 'skill-2' }])
    assert.equal(snakeCaseDto.requested_outcome, 'request_re_review')
  })

  test('confirm review request mapper accepts camelCase and snake_case dispute reason', ({
    assert,
  }) => {
    const camelCaseDto = buildConfirmReviewDTO(
      fakeRequest({
        action: 'disputed',
        disputeReason: 'Need second opinion',
      }) as never,
      'session-1'
    )

    assert.equal(camelCaseDto.review_session_id, 'session-1')
    assert.equal(camelCaseDto.action, 'disputed')
    assert.equal(camelCaseDto.dispute_reason, 'Need second opinion')

    const snakeCaseDto = buildConfirmReviewDTO(
      fakeRequest({
        action: 'disputed',
        dispute_reason: 'Need escalation',
      }) as never,
      'session-2'
    )

    assert.equal(snakeCaseDto.review_session_id, 'session-2')
    assert.equal(snakeCaseDto.action, 'disputed')
    assert.equal(snakeCaseDto.dispute_reason, 'Need escalation')
  })

  test('review evidence, reverse review, and resolve dispute request mappers accept camelCase', ({
    assert,
  }) => {
    const evidenceDto = buildAddReviewEvidenceDTO(
      fakeRequest({
        evidenceType: 'document_link',
        url: 'https://example.com',
        title: 'Spec doc',
        description: 'Support',
      }) as never,
      'session-1'
    )
    assert.equal(evidenceDto.review_session_id, 'session-1')
    assert.equal(evidenceDto.evidence_type, 'document_link')

    const reverseDto = buildSubmitReverseReviewDTO(
      fakeRequest({
        targetType: 'manager',
        targetId: 'manager-1',
        rating: 5,
        comment: 'Great support',
        isAnonymous: true,
      }) as never,
      'session-2'
    )
    assert.equal(reverseDto.review_session_id, 'session-2')
    assert.equal(reverseDto.target_type, 'manager')
    assert.equal(reverseDto.target_id, 'manager-1')
    assert.equal(reverseDto.rating, 5)
    assert.isTrue(reverseDto.is_anonymous)

    const resolveDto = buildResolveReviewDisputeDTO(
      fakeRequest({
        finalDecision: 'adjust_score',
        finalRationale: 'Evidence supports revision',
        profileUpdateAction: 'recalculate_after_adjustment',
        reviewerCredibilityAction: 'mark_disputed_review',
      }) as never,
      'dispute-1'
    )
    assert.equal(resolveDto.dispute_id, 'dispute-1')
    assert.equal(resolveDto.final_decision, 'adjust_score')
    assert.equal(resolveDto.final_rationale, 'Evidence supports revision')
    assert.equal(resolveDto.profile_update_action, 'recalculate_after_adjustment')
    assert.equal(resolveDto.reviewer_credibility_action, 'mark_disputed_review')

    const sprintResolveDto = buildResolveReviewDisputeDTO(
      fakeRequest({
        finalDecision: 'partially_accept',
        finalRationale: 'Sprint context supports partial acceptance',
        sourceType: 'sprint_review_dispute',
      }) as never,
      'sprint-dispute-1'
    )
    assert.equal(sprintResolveDto.dispute_id, 'sprint-dispute-1')
    assert.equal(sprintResolveDto.source_type, 'sprint_review_dispute')

    const aiDto = buildStartAiDisputeEvaluationDTO(
      fakeRequest({
        provider: 'ai_council',
      }) as never,
      'dispute-2'
    )
    assert.equal(aiDto.dispute_id, 'dispute-2')
    assert.equal(aiDto.provider, 'ai_council')
  })

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
      mapReviewDisputeCommentApiBody(
        serializable({
          id: 'comment-1',
          dispute_id: 'dispute-1',
          author_id: 'user-1',
          author_context: 'org_owner',
          author_system_role: null,
          body: 'Need more proof',
          visibility: 'all_parties',
          created_at: '2026-01-01T00:00:00.000Z',
        })
      ),
      {
        data: {
          id: 'comment-1',
          disputeId: 'dispute-1',
          authorId: 'user-1',
          authorContext: 'org_owner',
          authorSystemRole: null,
          body: 'Need more proof',
          visibility: 'all_parties',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: null,
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

  test('submit review request mapper rejects malformed skill ratings with business exceptions', ({
    assert,
  }) => {
    const request = fakeRequest({
      reviewer_type: 'manager',
      skill_ratings: [{ skill_id: VALID_SKILL_ID }],
    })

    try {
      buildSubmitSkillReviewDTO(request as never, VALID_REVIEW_SESSION_ID)
      assert.fail('Expected buildSubmitSkillReviewDTO to reject malformed skill_ratings')
    } catch (error) {
      assert.instanceOf(error, BusinessLogicException)
      assert.equal((error as BusinessLogicException).message, ErrorMessages.INVALID_INPUT)
    }

    const dto = buildSubmitSkillReviewDTO(
      fakeRequest({
        reviewerType: 'peer',
        skillRatings: [
          {
            skillId: VALID_SKILL_ID,
            levelCode: 'l10',
            comment: 'Strong delivery',
            insufficientEvidence: true,
          },
        ],
        overallQualityScore: '5',
        wouldWorkWithAgain: true,
      }) as never,
      VALID_REVIEW_SESSION_ID
    )

    assert.equal(dto.review_session_id, VALID_REVIEW_SESSION_ID)
    assert.equal(dto.reviewer_type, 'peer')
    assert.deepEqual(dto.skill_ratings, [
      {
        skill_id: VALID_SKILL_ID,
        assigned_public_proficiency_code: 'l10',
        comment: 'Strong delivery',
        insufficient_evidence: true,
        confidence: null,
        observable_behaviors: [],
        evidence_ids: [],
      },
    ])
    assert.equal(dto.overall_quality_score, 5)
    assert.isTrue(dto.would_work_with_again)

    assert.throws(
      () =>
        buildSubmitSkillReviewDTO(
          fakeRequest({
            reviewerType: 'peer',
            skillRatings: [
              {
                skillId: VALID_SKILL_ID,
                levelCode: 'senior',
              },
            ],
          }) as never,
          VALID_REVIEW_SESSION_ID
        ),
      /canonical code \(l0-l14\)/
    )

    assert.throws(
      () =>
        buildSubmitSkillReviewDTO(
          fakeRequest({
            reviewerType: 'peer',
            skillRatings: [
              {
                skillId: VALID_SKILL_ID,
                levelCode: 'l4',
                evidenceIds: ['evidence-1', 42],
              },
            ],
          }) as never,
          VALID_REVIEW_SESSION_ID
        ),
      ErrorMessages.INVALID_INPUT
    )
  })

})
