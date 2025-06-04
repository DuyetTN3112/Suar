import { test } from '@japa/runner'
import fs from 'node:fs'
import path from 'node:path'

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../..')

/**
 * Match Tests: Model Schema ↔ Database Types
 *
 * Ensures that Lucid model column definitions are consistent with
 * the TypeScript database types defined in app/types/database.ts.
 */

function readModelFile(modelName: string): string {
  return fs.readFileSync(path.join(WORKSPACE_ROOT, `app/models/${modelName}.ts`), 'utf-8')
}

function extractColumns(modelContent: string): string[] {
  const columnRegex = /@column[^]*?declare\s+(\w+)/g
  const columns: string[] = []
  let match
  while ((match = columnRegex.exec(modelContent)) !== null) {
    if (match[1]) columns.push(match[1])
  }
  return columns
}

function readDatabaseTypes(): string {
  return fs.readFileSync(path.join(WORKSPACE_ROOT, 'app/types/database.ts'), 'utf-8')
}

// ============================================================================
// User Model — ~5 tests
// ============================================================================
test.group('Match | User Model Schema', () => {
  test('User model has all essential columns', ({ assert }) => {
    const content = readModelFile('user')
    const columns = extractColumns(content)

    const required = [
      'id',
      'username',
      'email',
      'status',
      'system_role',
      'is_freelancer',
      'created_at',
      'updated_at',
    ]

    for (const col of required) {
      assert.include(columns, col, `User model missing column: ${col}`)
    }
  })

  test('User model has JSONB trust fields', ({ assert }) => {
    const content = readModelFile('user')
    const columns = extractColumns(content)

    assert.include(columns, 'trust_data')
    assert.include(columns, 'credibility_data')
  })

  test('User model has profile fields', ({ assert }) => {
    const content = readModelFile('user')
    const columns = extractColumns(content)

    const profileFields = [
      'bio',
      'phone',
      'address',
      'timezone',
      'language',
      'avatar_url',
      'profile_settings',
    ]
    for (const col of profileFields) {
      assert.include(columns, col, `User model missing profile column: ${col}`)
    }
  })

  test('User model has freelancer fields', ({ assert }) => {
    const content = readModelFile('user')
    const columns = extractColumns(content)

    assert.include(columns, 'freelancer_rating')
    assert.include(columns, 'freelancer_completed_tasks_count')
  })

  test('User model has auth fields', ({ assert }) => {
    const content = readModelFile('user')
    const columns = extractColumns(content)

    assert.include(columns, 'auth_method')
    assert.include(columns, 'current_organization_id')
  })
})

// ============================================================================
// Task Model — ~10 tests
// ============================================================================
test.group('Match | Task Model Schema', () => {
  test('Task model has all essential columns', ({ assert }) => {
    const content = readModelFile('task')
    const columns = extractColumns(content)

    const required = [
      'id',
      'title',
      'status',
      'priority',
      'label',
      'creator_id',
      'organization_id',
      'created_at',
      'updated_at',
    ]

    for (const col of required) {
      assert.include(columns, col, `Task model missing column: ${col}`)
    }
  })

  test('Task model has freelancer marketplace columns', ({ assert }) => {
    const content = readModelFile('task')
    const columns = extractColumns(content)

    assert.include(columns, 'task_visibility')
    assert.include(columns, 'application_deadline')
    assert.include(columns, 'estimated_budget')
    assert.include(columns, 'external_applications_count')
  })

  test('Task model has time tracking columns', ({ assert }) => {
    const content = readModelFile('task')
    const columns = extractColumns(content)

    assert.include(columns, 'estimated_time')
    assert.include(columns, 'actual_time')
  })

  test('Task model has hierarchy columns', ({ assert }) => {
    const content = readModelFile('task')
    const columns = extractColumns(content)

    assert.include(columns, 'parent_task_id')
    assert.include(columns, 'project_id')
  })

  test('Task model has sort_order column', ({ assert }) => {
    const content = readModelFile('task')
    const columns = extractColumns(content)

    assert.include(columns, 'sort_order')
  })

  test('Task model has soft delete column', ({ assert }) => {
    const content = readModelFile('task')
    const columns = extractColumns(content)

    assert.include(columns, 'deleted_at')
  })

  test('Task model has difficulty column', ({ assert }) => {
    const content = readModelFile('task')
    const columns = extractColumns(content)

    assert.include(columns, 'difficulty')
  })

  test('Task model has relationships', ({ assert }) => {
    const content = readModelFile('task')

    assert.isTrue(content.includes('belongsTo'), 'Task should have belongsTo relationships')
    assert.isTrue(content.includes('hasMany'), 'Task should have hasMany relationships')
    assert.isTrue(content.includes('creator'), 'Task should have creator relationship')
    assert.isTrue(content.includes('organization'), 'Task should have organization relationship')
  })

  test('Task model has child tasks relationship', ({ assert }) => {
    const content = readModelFile('task')

    assert.isTrue(content.includes('childTasks') || content.includes('child_tasks'))
    assert.isTrue(content.includes('parentTask') || content.includes('parent_task'))
  })

  test('Task model has applications and assignments relationships', ({ assert }) => {
    const content = readModelFile('task')

    assert.isTrue(content.includes('applications'))
    assert.isTrue(content.includes('assignments'))
  })
})

// ============================================================================
// TaskApplication Model — ~3 tests
// ============================================================================
test.group('Match | TaskApplication Model Schema', () => {
  test('TaskApplication model has all essential columns', ({ assert }) => {
    const content = readModelFile('task_application')
    const columns = extractColumns(content)

    const required = [
      'id',
      'task_id',
      'applicant_id',
      'application_status',
      'application_source',
      'applied_at',
    ]

    for (const col of required) {
      assert.include(columns, col, `TaskApplication model missing column: ${col}`)
    }
  })

  test('TaskApplication model has review fields', ({ assert }) => {
    const content = readModelFile('task_application')
    const columns = extractColumns(content)

    assert.include(columns, 'reviewed_by')
    assert.include(columns, 'reviewed_at')
    assert.include(columns, 'rejection_reason')
  })

  test('TaskApplication model has optional applicant fields', ({ assert }) => {
    const content = readModelFile('task_application')
    const columns = extractColumns(content)

    assert.include(columns, 'message')
    assert.include(columns, 'expected_rate')
    assert.include(columns, 'portfolio_links')
  })
})

// ============================================================================
// TaskAssignment Model — ~2 tests
// ============================================================================
test.group('Match | TaskAssignment Model Schema', () => {
  test('TaskAssignment model has all essential columns', ({ assert }) => {
    const content = readModelFile('task_assignment')
    const columns = extractColumns(content)

    const required = [
      'id',
      'task_id',
      'assignee_id',
      'assigned_by',
      'assignment_type',
      'assignment_status',
      'assigned_at',
    ]

    for (const col of required) {
      assert.include(columns, col, `TaskAssignment model missing column: ${col}`)
    }
  })

  test('TaskAssignment model has progress tracking columns', ({ assert }) => {
    const content = readModelFile('task_assignment')
    const columns = extractColumns(content)

    assert.include(columns, 'estimated_hours')
    assert.include(columns, 'actual_hours')
    assert.include(columns, 'progress_percentage')
  })
})

// ============================================================================
// Organization Model — ~3 tests
// ============================================================================
test.group('Match | Organization Model Schema', () => {
  test('Organization model has all essential columns', ({ assert }) => {
    const content = readModelFile('organization')
    const columns = extractColumns(content)

    const required = ['id', 'name', 'slug', 'owner_id', 'plan', 'created_at', 'updated_at']

    for (const col of required) {
      assert.include(columns, col, `Organization model missing column: ${col}`)
    }
  })

  test('Organization model has partner columns', ({ assert }) => {
    const content = readModelFile('organization')
    const columns = extractColumns(content)

    const partnerColumns = [
      'partner_type',
      'partner_verified_at',
      'partner_verified_by',
      'partner_verification_proof',
      'partner_expires_at',
      'partner_is_active',
    ]

    for (const col of partnerColumns) {
      assert.include(columns, col, `Organization model missing partner column: ${col}`)
    }
  })

  test('Organization model has custom_roles JSONB', ({ assert }) => {
    const content = readModelFile('organization')
    const columns = extractColumns(content)

    assert.include(columns, 'custom_roles')
  })
})

// ============================================================================
// OrganizationUser Model — ~2 tests
// ============================================================================
test.group('Match | OrganizationUser Model Schema', () => {
  test('OrganizationUser model has composite key columns', ({ assert }) => {
    const content = readModelFile('organization_user')
    const columns = extractColumns(content)

    assert.include(columns, 'organization_id')
    assert.include(columns, 'user_id')
    assert.include(columns, 'org_role')
    assert.include(columns, 'status')
  })

  test('OrganizationUser model has invited_by', ({ assert }) => {
    const content = readModelFile('organization_user')
    const columns = extractColumns(content)

    assert.include(columns, 'invited_by')
  })
})

// ============================================================================
// Project Model — ~3 tests
// ============================================================================
test.group('Match | Project Model Schema', () => {
  test('Project model has all essential columns', ({ assert }) => {
    const content = readModelFile('project')
    const columns = extractColumns(content)

    const required = [
      'id',
      'name',
      'organization_id',
      'creator_id',
      'status',
      'visibility',
      'created_at',
      'updated_at',
    ]

    for (const col of required) {
      assert.include(columns, col, `Project model missing column: ${col}`)
    }
  })

  test('Project model has budget and freelancer fields', ({ assert }) => {
    const content = readModelFile('project')
    const columns = extractColumns(content)

    assert.include(columns, 'budget')
    assert.include(columns, 'allow_freelancer')
  })

  test('Project model has management columns', ({ assert }) => {
    const content = readModelFile('project')
    const columns = extractColumns(content)

    assert.include(columns, 'manager_id')
    assert.include(columns, 'owner_id')
  })
})

// ============================================================================
// ReviewSession Model — ~3 tests
// ============================================================================
test.group('Match | ReviewSession Model Schema', () => {
  test('ReviewSession model has all essential columns', ({ assert }) => {
    const content = readModelFile('review_session')
    const columns = extractColumns(content)

    const required = [
      'id',
      'reviewee_id',
      'status',
      'manager_review_completed',
      'peer_reviews_count',
      'required_peer_reviews',
      'created_at',
    ]

    for (const col of required) {
      assert.include(columns, col, `ReviewSession model missing column: ${col}`)
    }
  })

  test('ReviewSession model has task_assignment_id', ({ assert }) => {
    const content = readModelFile('review_session')
    const columns = extractColumns(content)

    assert.include(columns, 'task_assignment_id')
  })

  test('ReviewSession model has confirmations JSONB', ({ assert }) => {
    const content = readModelFile('review_session')
    const columns = extractColumns(content)

    assert.include(columns, 'confirmations')
  })
})

// ============================================================================
// SkillReview Model — ~2 tests
// ============================================================================
test.group('Match | SkillReview Model Schema', () => {
  test('SkillReview model has all essential columns', ({ assert }) => {
    const content = readModelFile('skill_review')
    const columns = extractColumns(content)

    const required = [
      'id',
      'review_session_id',
      'reviewer_id',
      'reviewer_type',
      'skill_id',
      'assigned_level_code',
      'created_at',
    ]

    for (const col of required) {
      assert.include(columns, col, `SkillReview model missing column: ${col}`)
    }
  })

  test('SkillReview model has comment field', ({ assert }) => {
    const content = readModelFile('skill_review')
    const columns = extractColumns(content)

    assert.include(columns, 'comment')
  })
})

// ============================================================================
// FlaggedReview Model — ~2 tests
// ============================================================================
test.group('Match | FlaggedReview Model Schema', () => {
  test('FlaggedReview model has all essential columns', ({ assert }) => {
    const content = readModelFile('flagged_review')
    const columns = extractColumns(content)

    const required = [
      'id',
      'skill_review_id',
      'flag_type',
      'severity',
      'status',
      'detected_at',
      'created_at',
    ]

    for (const col of required) {
      assert.include(columns, col, `FlaggedReview model missing column: ${col}`)
    }
  })

  test('FlaggedReview model has resolution fields', ({ assert }) => {
    const content = readModelFile('flagged_review')
    const columns = extractColumns(content)

    assert.include(columns, 'reviewed_by')
    assert.include(columns, 'reviewed_at')
    assert.include(columns, 'notes')
  })
})

// ============================================================================
// ReverseReview Model — ~2 tests
// ============================================================================
test.group('Match | ReverseReview Model Schema', () => {
  test('ReverseReview model has all essential columns', ({ assert }) => {
    const content = readModelFile('reverse_review')
    const columns = extractColumns(content)

    const required = [
      'id',
      'review_session_id',
      'reviewer_id',
      'target_type',
      'target_id',
      'rating',
      'created_at',
    ]

    for (const col of required) {
      assert.include(columns, col, `ReverseReview model missing column: ${col}`)
    }
  })

  test('ReverseReview model has comment and anonymity fields', ({ assert }) => {
    const content = readModelFile('reverse_review')
    const columns = extractColumns(content)

    assert.include(columns, 'comment')
    assert.include(columns, 'is_anonymous')
  })
})

// ============================================================================
// Conversation + Message Models — ~3 tests
// ============================================================================
test.group('Match | Conversation Model Schema', () => {
  test('Conversation model has all essential columns', ({ assert }) => {
    const content = readModelFile('conversation')
    const columns = extractColumns(content)

    const required = ['id', 'organization_id', 'created_at', 'updated_at']

    for (const col of required) {
      assert.include(columns, col, `Conversation model missing column: ${col}`)
    }
  })

  test('Conversation model has task_id for task-linked conversations', ({ assert }) => {
    const content = readModelFile('conversation')
    const columns = extractColumns(content)

    assert.include(columns, 'task_id')
  })

  test('Message model has recall fields', ({ assert }) => {
    const content = readModelFile('message')
    const columns = extractColumns(content)

    assert.include(columns, 'is_recalled')
    assert.include(columns, 'recalled_at')
    assert.include(columns, 'recall_scope')
  })
})

// ============================================================================
// Skill + UserSkill Models — ~3 tests
// ============================================================================
test.group('Match | Skill Model Schema', () => {
  test('Skill model has all essential columns', ({ assert }) => {
    const content = readModelFile('skill')
    const columns = extractColumns(content)

    const required = [
      'id',
      'skill_name',
      'skill_code',
      'category_code',
      'display_type',
      'is_active',
    ]

    for (const col of required) {
      assert.include(columns, col, `Skill model missing column: ${col}`)
    }
  })

  test('UserSkill model has all essential columns', ({ assert }) => {
    const content = readModelFile('user_skill')
    const columns = extractColumns(content)

    const required = [
      'id',
      'user_id',
      'skill_id',
      'level_code',
      'total_reviews',
      'avg_score',
      'avg_percentage',
    ]

    for (const col of required) {
      assert.include(columns, col, `UserSkill model missing column: ${col}`)
    }
  })

  test('RecruiterBookmark model has all essential columns', ({ assert }) => {
    const content = readModelFile('recruiter_bookmark')
    const columns = extractColumns(content)

    const required = ['id', 'recruiter_user_id', 'talent_user_id', 'created_at']

    for (const col of required) {
      assert.include(columns, col, `RecruiterBookmark model missing column: ${col}`)
    }
  })
})

// ============================================================================
// Database Types Consistency — ~3 tests
// ============================================================================
test.group('Match | Database Types File', () => {
  test('database.ts defines all major table row types', ({ assert }) => {
    const content = readDatabaseTypes()

    const expectedTypes = [
      'SkillRow',
      'UserRow',
      'OrganizationRow',
      'TaskRow',
      'TaskApplicationRow',
      'TaskAssignmentRow',
      'TaskRequiredSkillRow',
      'TaskVersionRow',
      'ReviewSessionRow',
      'SkillReviewRow',
      'ReverseReviewRow',
      'FlaggedReviewRow',
      'UserSkillRow',
      'RecruiterBookmarkRow',
      'ConversationRow',
      'MessageRow',
      'ProjectRow',
      'ProjectMemberRow',
      'OrganizationUserRow',
    ]

    for (const typeName of expectedTypes) {
      assert.isTrue(content.includes(typeName), `database.ts missing type: ${typeName}`)
    }
  })

  test('DatabaseId is string type (UUIDv7)', ({ assert }) => {
    const content = readDatabaseTypes()
    assert.isTrue(content.includes('type DatabaseId = string'))
  })

  test('JSONB types are defined for User trust/credibility', ({ assert }) => {
    const content = readDatabaseTypes()
    assert.isTrue(content.includes('UserTrustData'))
    assert.isTrue(content.includes('UserCredibilityData'))
    assert.isTrue(content.includes('UserProfileSettings'))
  })
})
