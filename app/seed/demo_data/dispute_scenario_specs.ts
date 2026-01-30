import type { OrgKey, ProjectKey, UserKey } from './types.js'

export type DisputeReviewType = 'task_review' | 'manager_review' | 'environment_review'

export const EXPECTED_DISPUTE_REVIEW_TYPES = [
  'task_review',
  'manager_review',
  'environment_review',
] as const satisfies readonly DisputeReviewType[]

export interface DisputeScenarioSpec {
  key: string
  reviewType: DisputeReviewType
  organization: OrgKey
  project: ProjectKey
  sprint?: string
  primaryTask: string
  relatedTasks: string[]
  taskGiver: UserKey
  worker: UserKey
  counterparty: UserKey
  expectedDecision?: 'adjust_score' | 'uphold_review' | 'request_re_review' | 'partially_accept'
  evidenceSummary: string
}

export const DISPUTE_SCENARIO_SPECS: DisputeScenarioSpec[] = [
  {
    key: 'taskReviewEvidenceUnderscored',
    reviewType: 'task_review',
    organization: 'orgA',
    project: 'orgAOperations',
    sprint: 'operationsReviewJuly',
    primaryTask: 'owner-review-dispute-case',
    relatedTasks: ['member-admin-regression', 'owner-data-governance'],
    taskGiver: 'orgAdmin',
    worker: 'owner',
    counterparty: 'peerReviewer',
    expectedDecision: 'adjust_score',
    evidenceSummary:
      'Chứng cứ bàn giao, nhật ký nghiệm thu và các hạng mục liên quan cùng xác nhận phạm vi công việc rộng hơn phần điểm ban đầu.',
  },
  {
    key: 'managerSprintPlanningAmbiguity',
    reviewType: 'manager_review',
    organization: 'orgA',
    project: 'orgAPlatform',
    sprint: 'trustReviewJuly',
    primaryTask: 'member-profile-proof',
    relatedTasks: ['member-org-switch', 'member-profile-live'],
    taskGiver: 'owner',
    worker: 'member',
    counterparty: 'owner',
    expectedDecision: 'partially_accept',
    evidenceSummary:
      'Việc bàn giao sprint hỗ trợ tiến độ, nhưng ví dụ minh họa cho rubric được cung cấp muộn.',
  },
  {
    key: 'environmentOwnershipAmbiguity',
    reviewType: 'environment_review',
    organization: 'orgA',
    project: 'orgAPlatform',
    sprint: 'trustReviewJuly',
    primaryTask: 'member-profile-proof',
    relatedTasks: ['member-org-switch', 'member-profile-live'],
    taskGiver: 'owner',
    worker: 'orgAdmin',
    counterparty: 'owner',
    expectedDecision: 'request_re_review',
    evidenceSummary:
      'Đánh giá môi trường làm việc cần được thực hiện lại sau khi làm rõ trách nhiệm chấm điểm và phản hồi.',
  },
]
