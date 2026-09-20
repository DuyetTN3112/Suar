export interface MockReviewer {
  reviewer_id: string
  reviewer_name: string
  reviewer_role: string
  status: 'pending' | 'submitted' | 'waived'
  priority_rank: number
}

export interface MockReviewRevision {
  id: string
  revision_number: number
  body: string
  editor_id: string
  editor_name: string
  created_at: string
}

export interface MockReviewMessage {
  id: string
  author_id: string
  author_name: string | null
  message_type?: string
  body: string
  created_at: string
  updated_at?: string | null
  parent_review_message_id?: string | null
  reviewee_decision?: 'accepted' | 'rejected' | null
  requires_reviewer_confirmation?: boolean
  reviewer_agreed_at?: string | null
  revision_count?: number
  revisions?: MockReviewRevision[]
}

export interface MockReviewWorkflowDetail {
  task: {
    assigned_to: string
    creator_id?: string
  }
  workflow: {
    id: string
    status: string
    completed_review_count?: number
    required_review_count?: number
  } | null
  reviewers: MockReviewer[]
  comments: MockReviewMessage[]
  reviewMessages: MockReviewMessage[]
  reviewAuthoringContext?: Record<string, unknown>
}

export function createMockTaskReviewDetail(
  overrides?: Partial<MockReviewWorkflowDetail>
): MockReviewWorkflowDetail {
  return {
    task: {
      assigned_to: 'worker-1',
      ...overrides?.task,
    },
    workflow:
      overrides?.workflow === null
        ? null
        : {
            id: 'workflow-1',
            status: 'awaiting_review',
            completed_review_count: 0,
            required_review_count: 2,
            ...overrides?.workflow,
          },
    reviewers: overrides?.reviewers ?? [
      {
        reviewer_id: 'reviewer-1',
        reviewer_name: 'Reviewer',
        reviewer_role: 'peer',
        status: 'pending',
        priority_rank: 1,
      },
    ],
    comments: overrides?.comments ?? [],
    reviewMessages: overrides?.reviewMessages ?? [],
    ...(overrides?.reviewAuthoringContext
      ? { reviewAuthoringContext: overrides.reviewAuthoringContext }
      : {}),
  }
}

export function createDefaultObservationContext(): Record<string, unknown> {
  return {
    reviewSessionId: '22222222-2222-4222-8222-222222222222',
    taskAssignmentId: '33333333-3333-4333-8333-333333333333',
    assignmentSnapshotId: '44444444-4444-4444-8444-444444444444',
    assignmentSnapshotHash: `sha256:${'a'.repeat(64)}`,
    completionReportId: '55555555-5555-4555-8555-555555555555',
    completionReportHash: `sha256:${'b'.repeat(64)}`,
    taskContractVersionId: '66666666-6666-4666-8666-666666666666',
    taskContractHash: `sha256:${'c'.repeat(64)}`,
    subjectUserId: 'worker-1',
    claims: [
      {
        id: '77777777-7777-4777-8777-777777777777',
        proposed_title: 'Claim',
        proposed_statement: 'Statement',
        action: 'deliver',
        object: 'change',
        actual_ownership: 'contributor',
        claim_status: 'candidate',
        deliverable_refs: [],
        criterion_result_refs: [],
      },
    ],
    evidence: [
      {
        id: '88888888-8888-4888-8888-888888888888',
        reviewer_access_state: 'available',
        access_classification: 'internal',
      },
    ],
    reviewerTypes: [{ reviewer_id: 'reviewer-1', reviewer_type: 'human' }],
  }
}
