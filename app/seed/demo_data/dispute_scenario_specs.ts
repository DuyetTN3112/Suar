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
  expectedDecision?: 'adjust_score' | 'uphold_review' | 'request_more_evidence' | 'partially_accept'
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
    evidenceSummary: 'Submission evidence and related operations work support a score adjustment.',
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
    evidenceSummary: 'Sprint handoff helped delivery, but rubric examples arrived late.',
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
    worker: 'member',
    counterparty: 'orgAdmin',
    expectedDecision: 'request_more_evidence',
    evidenceSummary:
      'Environment review needs clearer ownership signals for sprint scoring governance.',
  },
]
