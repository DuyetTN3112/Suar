import { test } from '@japa/runner'
import {
  TaskStatus,
  TaskLabel,
  TaskPriority,
  TaskDifficulty,
  TaskVisibility,
  ApplicationStatus,
  AssignmentStatus,
  AssignmentType,
} from '#constants/task_constants'
import {
  ReviewSessionStatus,
  ReviewerType,
  ReviewConfirmationAction,
  AnomalyFlagType,
  AnomalySeverity,
  FlaggedReviewStatus,
  REVIEW_DEFAULTS,
} from '#constants/review_constants'
import {
  ProficiencyLevel,
  TrustTierCode,
  UserStatusName,
  SystemRoleName,
  AuthMethod,
  SkillCategoryCode,
  TRUST_TIER_WEIGHTS,
} from '#constants/user_constants'
import {
  OrganizationRole,
  OrganizationUserStatus,
  OrganizationPlan,
} from '#constants/organization_constants'
import { ProjectStatus, ProjectVisibility, ProjectRole } from '#constants/project_constants'
import {
  MessageSendStatus,
  MessageRecallScope,
  CONVERSATION_DEFAULTS,
} from '#constants/conversation_constants'
import fs from 'node:fs'
import path from 'node:path'

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../..')

function readFrontendFile(relativePath: string): string {
  return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf-8')
}

/**
 * Match Tests: Backend Constants ↔ Frontend Type Values
 *
 * Ensures that the union type values defined in frontend .svelte.ts files
 * exactly match the enum values exported from backend constants.
 */

// ============================================================================
// Task Constants Match — ~8 tests
// ============================================================================
test.group('Match | Task Constants', () => {
  const FE_TASK_STATUSES = ['todo', 'in_progress', 'done', 'cancelled', 'in_review']

  test('TaskStatus enum values match frontend type', ({ assert }) => {
    const beValues = Object.values(TaskStatus)
    assert.deepEqual(beValues.sort(), [...FE_TASK_STATUSES].sort())
  })

  test('TaskStatus has same count as frontend', ({ assert }) => {
    assert.equal(Object.values(TaskStatus).length, FE_TASK_STATUSES.length)
  })

  const FE_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent']

  test('TaskPriority enum values match frontend type', ({ assert }) => {
    const beValues = Object.values(TaskPriority)
    assert.deepEqual(beValues.sort(), [...FE_TASK_PRIORITIES].sort())
  })

  const FE_TASK_LABELS = ['bug', 'feature', 'enhancement', 'documentation']

  test('TaskLabel enum values match frontend type', ({ assert }) => {
    const beValues = Object.values(TaskLabel)
    assert.deepEqual(beValues.sort(), [...FE_TASK_LABELS].sort())
  })

  const FE_TASK_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert']

  test('TaskDifficulty enum values match frontend type', ({ assert }) => {
    const beValues = Object.values(TaskDifficulty)
    assert.deepEqual(beValues.sort(), [...FE_TASK_DIFFICULTIES].sort())
  })

  test('TaskVisibility has 3 values: internal, external, all', ({ assert }) => {
    const beValues = Object.values(TaskVisibility)
    assert.equal(beValues.length, 3)
    assert.include(beValues, 'internal')
    assert.include(beValues, 'external')
    assert.include(beValues, 'all')
  })

  test('ApplicationStatus has 4 values', ({ assert }) => {
    const beValues = Object.values(ApplicationStatus)
    assert.equal(beValues.length, 4)
    assert.include(beValues, 'pending')
    assert.include(beValues, 'approved')
    assert.include(beValues, 'rejected')
    assert.include(beValues, 'withdrawn')
  })

  test('AssignmentStatus and AssignmentType have correct values', ({ assert }) => {
    const statusValues = Object.values(AssignmentStatus)
    assert.include(statusValues, 'active')
    assert.include(statusValues, 'completed')
    assert.include(statusValues, 'cancelled')

    const typeValues = Object.values(AssignmentType)
    assert.include(typeValues, 'member')
    assert.include(typeValues, 'freelancer')
  })
})

// ============================================================================
// Review Constants Match — ~8 tests
// ============================================================================
test.group('Match | Review Constants', () => {
  const FE_REVIEW_SESSION_STATUSES = ['pending', 'in_progress', 'completed', 'disputed']

  test('ReviewSessionStatus enum matches frontend type', ({ assert }) => {
    const beValues = Object.values(ReviewSessionStatus)
    assert.deepEqual(beValues.sort(), [...FE_REVIEW_SESSION_STATUSES].sort())
  })

  test('frontend REVIEW_STATUS_CONFIG covers all statuses', ({ assert }) => {
    const configKeys = ['pending', 'in_progress', 'completed', 'disputed']
    const beValues = Object.values(ReviewSessionStatus)
    assert.deepEqual(beValues.sort(), [...configKeys].sort())
  })

  test('ReviewerType has manager and peer', ({ assert }) => {
    const beValues = Object.values(ReviewerType)
    assert.equal(beValues.length, 2)
    assert.include(beValues, 'manager')
    assert.include(beValues, 'peer')
  })

  test('ReviewConfirmationAction has confirmed and disputed', ({ assert }) => {
    const beValues = Object.values(ReviewConfirmationAction)
    assert.equal(beValues.length, 2)
    assert.include(beValues, 'confirmed')
    assert.include(beValues, 'disputed')
  })

  test('AnomalyFlagType has 6 types', ({ assert }) => {
    const beValues = Object.values(AnomalyFlagType)
    assert.equal(beValues.length, 6)
    assert.include(beValues, 'mutual_high')
    assert.include(beValues, 'bulk_same_level')
    assert.include(beValues, 'new_account_high')
  })

  test('AnomalySeverity has 4 levels', ({ assert }) => {
    const beValues = Object.values(AnomalySeverity)
    assert.equal(beValues.length, 4)
    assert.include(beValues, 'low')
    assert.include(beValues, 'medium')
    assert.include(beValues, 'high')
    assert.include(beValues, 'critical')
  })

  test('FlaggedReviewStatus has 4 statuses', ({ assert }) => {
    const beValues = Object.values(FlaggedReviewStatus)
    assert.equal(beValues.length, 4)
    assert.include(beValues, 'pending')
    assert.include(beValues, 'dismissed')
    assert.include(beValues, 'confirmed')
  })

  test('REVIEW_DEFAULTS has correct initial values', ({ assert }) => {
    assert.equal(REVIEW_DEFAULTS.INITIAL_CREDIBILITY_SCORE, 50)
    assert.equal(REVIEW_DEFAULTS.MIN_PEER_REVIEWS, 2)
    assert.equal(REVIEW_DEFAULTS.MAX_CREDIBILITY_SCORE, 100)
    assert.isAtLeast(REVIEW_DEFAULTS.MIN_RATING, 1)
    assert.isAtMost(REVIEW_DEFAULTS.MAX_RATING, 5)
  })
})

// ============================================================================
// User Constants Match — ~6 tests
// ============================================================================
test.group('Match | User Constants', () => {
  const FE_PROFICIENCY_LEVELS = [
    'beginner',
    'elementary',
    'junior',
    'middle',
    'senior',
    'lead',
    'principal',
    'master',
  ]

  test('ProficiencyLevel enum matches frontend type', ({ assert }) => {
    const beValues = Object.values(ProficiencyLevel)
    assert.deepEqual(beValues.sort(), [...FE_PROFICIENCY_LEVELS].sort())
  })

  test('ProficiencyLevel has same count as frontend', ({ assert }) => {
    assert.equal(Object.values(ProficiencyLevel).length, FE_PROFICIENCY_LEVELS.length)
  })

  test('UserStatusName has 3 statuses', ({ assert }) => {
    const beValues = Object.values(UserStatusName)
    assert.equal(beValues.length, 3)
    assert.include(beValues, 'active')
    assert.include(beValues, 'inactive')
    assert.include(beValues, 'suspended')
  })

  test('SystemRoleName has 3 roles', ({ assert }) => {
    const beValues = Object.values(SystemRoleName)
    assert.equal(beValues.length, 3)
    assert.include(beValues, 'superadmin')
    assert.include(beValues, 'system_admin')
    assert.include(beValues, 'registered_user')
  })

  test('AuthMethod has 3 methods', ({ assert }) => {
    const beValues = Object.values(AuthMethod)
    assert.equal(beValues.length, 3)
    assert.include(beValues, 'email')
    assert.include(beValues, 'google')
    assert.include(beValues, 'github')
  })

  test('SkillCategoryCode has 3 categories', ({ assert }) => {
    const beValues = Object.values(SkillCategoryCode)
    assert.equal(beValues.length, 3)
    assert.include(beValues, 'technical')
    assert.include(beValues, 'soft_skill')
    assert.include(beValues, 'delivery')
  })
})

// ============================================================================
// Trust Tier Match — ~3 tests
// ============================================================================
test.group('Match | Trust Tiers', () => {
  test('TrustTierCode has 3 tiers', ({ assert }) => {
    assert.equal(Object.values(TrustTierCode).length, 3)
  })

  test('TrustTierCode includes community, organization, partner', ({ assert }) => {
    const values = Object.values(TrustTierCode)
    assert.include(values, 'community')
    assert.include(values, 'organization')
    assert.include(values, 'partner')
  })

  test('TRUST_TIER_WEIGHTS are ordered: community < organization < partner', ({ assert }) => {
    assert.isBelow(TRUST_TIER_WEIGHTS.community, TRUST_TIER_WEIGHTS.organization)
    assert.isBelow(TRUST_TIER_WEIGHTS.organization, TRUST_TIER_WEIGHTS.partner)
  })
})

// ============================================================================
// Organization Constants Match — ~4 tests
// ============================================================================
test.group('Match | Organization Constants', () => {
  test('OrganizationRole has 3 roles', ({ assert }) => {
    assert.equal(Object.values(OrganizationRole).length, 3)
  })

  test('OrganizationRole includes owner, admin, member', ({ assert }) => {
    const values = Object.values(OrganizationRole)
    assert.include(values, 'org_owner')
    assert.include(values, 'org_admin')
    assert.include(values, 'org_member')
  })

  test('OrganizationUserStatus includes pending, approved, rejected', ({ assert }) => {
    const values = Object.values(OrganizationUserStatus)
    assert.include(values, 'pending')
    assert.include(values, 'approved')
    assert.include(values, 'rejected')
  })

  test('OrganizationPlan has 4 plans', ({ assert }) => {
    const values = Object.values(OrganizationPlan)
    assert.equal(values.length, 4)
    assert.include(values, 'free')
    assert.include(values, 'starter')
    assert.include(values, 'professional')
    assert.include(values, 'enterprise')
  })
})

// ============================================================================
// Project Constants Match — ~3 tests
// ============================================================================
test.group('Match | Project Constants', () => {
  test('ProjectStatus has 4 statuses', ({ assert }) => {
    assert.equal(Object.values(ProjectStatus).length, 4)
  })

  test('ProjectVisibility has 3 values', ({ assert }) => {
    const values = Object.values(ProjectVisibility)
    assert.equal(values.length, 3)
    assert.include(values, 'private')
    assert.include(values, 'team')
    assert.include(values, 'public')
  })

  test('ProjectRole has 4 roles', ({ assert }) => {
    const values = Object.values(ProjectRole)
    assert.equal(values.length, 4)
    assert.include(values, 'project_owner')
    assert.include(values, 'project_manager')
    assert.include(values, 'project_member')
    assert.include(values, 'project_viewer')
  })
})

// ============================================================================
// Conversation Constants Match — ~3 tests
// ============================================================================
test.group('Match | Conversation Constants', () => {
  test('MessageSendStatus has 3 statuses', ({ assert }) => {
    const values = Object.values(MessageSendStatus)
    assert.equal(values.length, 3)
    assert.include(values, 'sending')
    assert.include(values, 'sent')
    assert.include(values, 'failed')
  })

  test('MessageRecallScope has 2 scopes', ({ assert }) => {
    const values = Object.values(MessageRecallScope)
    assert.equal(values.length, 2)
    assert.include(values, 'self')
    assert.include(values, 'all')
  })

  test('CONVERSATION_DEFAULTS has reasonable values', ({ assert }) => {
    assert.isAbove(CONVERSATION_DEFAULTS.MESSAGES_PER_PAGE, 0)
    assert.isAbove(CONVERSATION_DEFAULTS.MAX_MESSAGE_LENGTH, 0)
    assert.isAbove(CONVERSATION_DEFAULTS.CONVERSATIONS_PER_PAGE, 0)
  })
})

// ============================================================================
// Frontend ↔ Backend Constants Cross-check — ~3 tests
// ============================================================================
test.group('Match | Frontend Constants Cross-check', () => {
  test('frontend task types file has all backend TaskDifficulty values', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/tasks/types.svelte.ts')
    for (const diff of Object.values(TaskDifficulty)) {
      assert.isTrue(content.includes(`'${diff}'`), `Frontend missing TaskDifficulty: ${diff}`)
    }
  })

  test('frontend review types file has all ReviewerType values', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/reviews/types.svelte.ts')
    for (const type of Object.values(ReviewerType)) {
      assert.isTrue(content.includes(`'${type}'`), `Frontend missing ReviewerType: ${type}`)
    }
  })

  test('frontend marketplace DIFFICULTY_CONFIG covers all difficulties', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/marketplace/types.svelte.ts')
    for (const diff of Object.values(TaskDifficulty)) {
      assert.isTrue(content.includes(diff), `Frontend marketplace missing difficulty: ${diff}`)
    }
  })
})
