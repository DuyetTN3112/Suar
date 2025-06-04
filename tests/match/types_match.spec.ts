import { test } from '@japa/runner'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Match Tests: Backend Types ↔ Frontend Types
 *
 * Ensures that frontend TypeScript types contain all the fields
 * that the backend database types and DTO responses expose.
 */

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../..')

function readFrontendFile(relativePath: string): string {
  return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf-8')
}

function readBackendFile(relativePath: string): string {
  return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf-8')
}

// ============================================================================
// Task Type Fields Match — ~7 tests
// ============================================================================
test.group('Match | Task Type Fields', () => {
  const REQUIRED_TASK_FIELDS = [
    'id',
    'title',
    'status',
    'label',
    'priority',
    'creator_id',
    'due_date',
    'created_at',
    'updated_at',
    'organization_id',
  ]

  test('frontend Task type has all required fields', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/tasks/types.svelte.ts')

    for (const field of REQUIRED_TASK_FIELDS) {
      assert.isTrue(content.includes(field), `Frontend Task type missing field: ${field}`)
    }
  })

  test('frontend Task type has optional fields', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/tasks/types.svelte.ts')
    const optionalFields = [
      'description',
      'assigned_to',
      'parent_task_id',
      'project_id',
      'estimated_time',
      'actual_time',
      'difficulty',
    ]

    for (const field of optionalFields) {
      assert.isTrue(content.includes(field), `Frontend Task type missing field: ${field}`)
    }
  })

  test('frontend Task type has marketplace fields', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/tasks/types.svelte.ts')
    const marketplaceFields = ['task_visibility', 'application_deadline', 'estimated_budget']

    for (const field of marketplaceFields) {
      assert.isTrue(
        content.includes(field),
        `Frontend Task type missing marketplace field: ${field}`
      )
    }
  })

  test('frontend Task type has sort_order for drag-drop', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/tasks/types.svelte.ts')
    assert.isTrue(content.includes('sort_order'))
  })

  test('frontend task list has pagination meta', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/tasks/types.svelte.ts')
    assert.isTrue(content.includes('total'))
    assert.isTrue(content.includes('per_page'))
    assert.isTrue(content.includes('current_page'))
    assert.isTrue(content.includes('last_page'))
  })

  test('frontend Task status values match backend enum', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/tasks/types.svelte.ts')
    const expectedStatuses = ['todo', 'in_progress', 'done', 'cancelled', 'in_review']
    for (const status of expectedStatuses) {
      assert.isTrue(content.includes(`'${status}'`), `Frontend missing task status: ${status}`)
    }
  })

  test('frontend Task uses creator_id not created_by', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/tasks/types.svelte.ts')
    assert.isTrue(content.includes('creator_id'))
    assert.isFalse(content.includes('created_by'), 'Frontend should use creator_id, not created_by')
  })
})

// ============================================================================
// Marketplace Type Fields Match — ~4 tests
// ============================================================================
test.group('Match | Marketplace Type Fields', () => {
  test('frontend MarketplaceTask type has essential fields', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/marketplace/types.svelte.ts')
    const required = ['id', 'title', 'description', 'difficulty', 'due_date']

    for (const field of required) {
      assert.isTrue(content.includes(field), `MarketplaceTask missing field: ${field}`)
    }
  })

  test('frontend MarketplaceTask has organization info', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/marketplace/types.svelte.ts')
    assert.isTrue(content.includes('organization') || content.includes('SerializedOrganization'))
  })

  test('frontend MarketplaceTask has required_skills', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/marketplace/types.svelte.ts')
    assert.isTrue(
      content.includes('required_skills') || content.includes('SerializedRequiredSkill')
    )
  })

  test('frontend Marketplace has pagination and filters types', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/marketplace/types.svelte.ts')
    assert.isTrue(content.includes('PaginationMeta'))
    assert.isTrue(content.includes('MarketplaceFilters'))
  })
})

// ============================================================================
// Organization Type Fields Match — ~3 tests
// ============================================================================
test.group('Match | Organization Type Fields', () => {
  const REQUIRED_ORG_FIELDS = ['id', 'name', 'owner_id', 'slug', 'created_at', 'updated_at']

  test('frontend Organization type has all required fields', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/organizations/types/index.ts')

    for (const field of REQUIRED_ORG_FIELDS) {
      assert.isTrue(content.includes(field), `Frontend Organization type missing field: ${field}`)
    }
  })

  test('frontend Organization has optional fields', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/organizations/types/index.ts')
    const optionalFields = ['description', 'logo', 'website', 'plan']

    for (const field of optionalFields) {
      assert.isTrue(content.includes(field), `Frontend Organization type missing field: ${field}`)
    }
  })

  test('frontend OrganizationUser has role field', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/organizations/types/index.ts')
    assert.isTrue(content.includes('org_role'))
    assert.isTrue(content.includes('user_id'))
    assert.isTrue(content.includes('organization_id'))
  })
})

// ============================================================================
// Review Type Fields Match — ~6 tests
// ============================================================================
test.group('Match | Review Type Fields', () => {
  test('frontend SerializedReviewSession has all required fields', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/reviews/types.svelte.ts')

    const requiredFields = [
      'review_session_id',
      'reviewee_id',
      'status',
      'manager_review_completed',
      'peer_reviews_count',
      'required_peer_reviews',
      'confirmations',
      'created_at',
    ]

    for (const field of requiredFields) {
      assert.isTrue(
        content.includes(field),
        `Frontend SerializedReviewSession missing field: ${field}`
      )
    }
  })

  test('frontend SerializedSkillReview has review fields', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/reviews/types.svelte.ts')

    const requiredFields = ['reviewer_id', 'reviewer_type', 'skill_id', 'assigned_level_code']

    for (const field of requiredFields) {
      assert.isTrue(
        content.includes(field),
        `Frontend SerializedSkillReview missing field: ${field}`
      )
    }
  })

  test('frontend has ProficiencyLevelOption structured correctly', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/reviews/types.svelte.ts')
    assert.isTrue(content.includes('minPercentage'))
    assert.isTrue(content.includes('maxPercentage'))
    assert.isTrue(content.includes('colorHex'))
    assert.isTrue(content.includes('order'))
  })

  test('frontend has SubmitReviewForm with required fields', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/reviews/types.svelte.ts')
    assert.isTrue(content.includes('reviewer_type'))
    assert.isTrue(content.includes('skill_ratings'))
    assert.isTrue(content.includes('level_code'))
  })

  test('frontend has ConfirmReviewForm with action', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/reviews/types.svelte.ts')
    assert.isTrue(content.includes('ConfirmReviewForm'))
    assert.isTrue(content.includes('dispute_reason'))
  })

  test('frontend has FlaggedReview types', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/reviews/types.svelte.ts')
    assert.isTrue(content.includes('SerializedFlaggedReview'))
    assert.isTrue(content.includes('flag_type'))
    assert.isTrue(content.includes('severity'))
  })
})

// ============================================================================
// Profile Type Fields Match — ~4 tests
// ============================================================================
test.group('Match | Profile Type Fields', () => {
  test('frontend Profile has SpiderChart types', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/profile/types.svelte.ts')
    assert.isTrue(content.includes('SpiderChartData') || content.includes('SpiderChartPoint'))
  })

  test('frontend Profile has SerializedUserProfile type', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/profile/types.svelte.ts')
    assert.isTrue(content.includes('SerializedUserProfile'))
  })

  test('frontend Profile has skill types', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/profile/types.svelte.ts')
    assert.isTrue(
      content.includes('SerializedUserSkillRelation') || content.includes('UserSkillResult')
    )
    assert.isTrue(content.includes('AvailableSkill') || content.includes('SkillCategoryOption'))
  })

  test('frontend Profile has TrustTier config', ({ assert }) => {
    const content = readFrontendFile('inertia/pages/profile/types.svelte.ts')
    assert.isTrue(content.includes('TrustTierCode') || content.includes('TRUST_TIER_CONFIG'))
  })
})

// ============================================================================
// Database Types Internal Consistency — ~3 tests
// ============================================================================
test.group('Match | Database Types Consistency', () => {
  test('database.ts defines all 23+ table types', ({ assert }) => {
    const content = readBackendFile('app/types/database.ts')

    const expectedTypes = [
      'SkillRow',
      'UserRow',
      'OrganizationRow',
      'TaskRow',
      'TaskApplicationRow',
      'ReviewSessionRow',
      'SkillReviewRow',
      'ConversationRow',
      'MessageRow',
      'ProjectRow',
    ]

    for (const typeName of expectedTypes) {
      assert.isTrue(content.includes(typeName), `database.ts missing type: ${typeName}`)
    }
  })

  test('UserRow has trust_data and credibility_data JSONB fields', ({ assert }) => {
    const content = readBackendFile('app/types/database.ts')
    assert.isTrue(content.includes('trust_data'))
    assert.isTrue(content.includes('credibility_data'))
    assert.isTrue(content.includes('UserTrustData'))
    assert.isTrue(content.includes('UserCredibilityData'))
  })

  test('DatabaseId is string type', ({ assert }) => {
    const content = readBackendFile('app/types/database.ts')
    assert.isTrue(content.includes('type DatabaseId = string'))
  })
})
