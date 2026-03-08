import { test } from '@japa/runner'
import fs from 'node:fs'
import path from 'node:path'

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../..')

/**
 * Match Tests: Routes ↔ Controllers ↔ Frontend Pages
 *
 * Validates that route definitions reference controllers that exist,
 * and frontend pages match expected route patterns.
 */

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(WORKSPACE_ROOT, relativePath))
}

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf-8')
}

function listFiles(dir: string): string[] {
  const fullPath = path.join(WORKSPACE_ROOT, dir)
  if (!fs.existsSync(fullPath)) return []
  return fs.readdirSync(fullPath, { recursive: true }) as string[]
}

// ============================================================================
// Route Files Exist — ~3 tests
// ============================================================================
test.group('Match | Route Files Exist', () => {
  test('main routes file exists', ({ assert }) => {
    assert.isTrue(fileExists('start/routes.ts'))
  })

  test('route sub-files exist for all domains', ({ assert }) => {
    const expectedRouteFiles = [
      'start/routes/tasks.ts',
      'start/routes/reviews.ts',
      'start/routes/users.ts',
      'start/routes/organizations.ts',
      'start/routes/projects.ts',
      'start/routes/conversations.ts',
    ]

    for (const file of expectedRouteFiles) {
      assert.isTrue(fileExists(file), `Missing route file: ${file}`)
    }
  })

  test('route index imports all sub-route files', ({ assert }) => {
    const indexPath = 'start/routes/index.ts'
    if (fileExists(indexPath)) {
      const content = readFile(indexPath)
      const domains = ['tasks', 'reviews', 'users', 'organizations', 'projects', 'conversations']
      for (const domain of domains) {
        assert.isTrue(content.includes(domain), `Route index missing import for: ${domain}`)
      }
    }
  })
})

// ============================================================================
// Task Controllers Exist — ~5 tests
// ============================================================================
test.group('Match | Task Controllers Exist', () => {
  test('all task CRUD controllers exist', ({ assert }) => {
    const required = [
      'app/controllers/tasks/create_task_controller.ts',
      'app/controllers/tasks/edit_task_controller.ts',
      'app/controllers/tasks/delete_task_controller.ts',
      'app/controllers/tasks/show_task_controller.ts',
      'app/controllers/tasks/list_tasks_controller.ts',
    ]

    for (const file of required) {
      assert.isTrue(fileExists(file), `Missing controller: ${file}`)
    }
  })

  test('task status and time controllers exist', ({ assert }) => {
    assert.isTrue(fileExists('app/controllers/tasks/update_task_status_controller.ts'))
    assert.isTrue(fileExists('app/controllers/tasks/update_task_time_controller.ts'))
    assert.isTrue(fileExists('app/controllers/tasks/update_task_sort_order_controller.ts'))
    assert.isTrue(fileExists('app/controllers/tasks/batch_update_task_status_controller.ts'))
  })

  test('task application controllers exist', ({ assert }) => {
    const required = [
      'app/controllers/tasks/apply_for_task_controller.ts',
      'app/controllers/tasks/apply_for_task_api_controller.ts',
      'app/controllers/tasks/process_application_controller.ts',
      'app/controllers/tasks/withdraw_application_controller.ts',
      'app/controllers/tasks/my_applications_controller.ts',
      'app/controllers/tasks/list_task_applications_controller.ts',
    ]

    for (const file of required) {
      assert.isTrue(fileExists(file), `Missing application controller: ${file}`)
    }
  })

  test('marketplace controllers exist', ({ assert }) => {
    assert.isTrue(fileExists('app/controllers/tasks/list_public_tasks_controller.ts'))
    assert.isTrue(fileExists('app/controllers/tasks/list_public_tasks_api_controller.ts'))
  })

  test('utility task controllers exist', ({ assert }) => {
    assert.isTrue(fileExists('app/controllers/tasks/check_create_permission_controller.ts'))
    assert.isTrue(fileExists('app/controllers/tasks/get_task_audit_logs_controller.ts'))
    assert.isTrue(fileExists('app/controllers/tasks/list_tasks_grouped_controller.ts'))
    assert.isTrue(fileExists('app/controllers/tasks/list_tasks_timeline_controller.ts'))
  })
})

// ============================================================================
// Review Controllers Exist — ~3 tests
// ============================================================================
test.group('Match | Review Controllers Exist', () => {
  test('review session controllers exist', ({ assert }) => {
    const required = [
      'app/controllers/reviews/list_pending_reviews_controller.ts',
      'app/controllers/reviews/show_review_controller.ts',
      'app/controllers/reviews/submit_review_controller.ts',
      'app/controllers/reviews/confirm_review_controller.ts',
      'app/controllers/reviews/create_review_session_controller.ts',
    ]

    for (const file of required) {
      assert.isTrue(fileExists(file), `Missing review controller: ${file}`)
    }
  })

  test('reverse review and flagged controllers exist', ({ assert }) => {
    assert.isTrue(fileExists('app/controllers/reviews/submit_reverse_review_controller.ts'))
    assert.isTrue(fileExists('app/controllers/reviews/list_flagged_reviews_controller.ts'))
    assert.isTrue(fileExists('app/controllers/reviews/resolve_flagged_review_controller.ts'))
  })

  test('review list controllers exist', ({ assert }) => {
    assert.isTrue(fileExists('app/controllers/reviews/my_reviews_controller.ts'))
    assert.isTrue(fileExists('app/controllers/reviews/user_reviews_controller.ts'))
  })
})

// ============================================================================
// User/Profile Controllers Exist — ~3 tests
// ============================================================================
test.group('Match | User Controllers Exist', () => {
  test('user CRUD controllers exist', ({ assert }) => {
    const required = [
      'app/controllers/users/list_users_controller.ts',
      'app/controllers/users/create_user_controller.ts',
      'app/controllers/users/show_user_controller.ts',
      'app/controllers/users/update_user_controller.ts',
      'app/controllers/users/delete_user_controller.ts',
    ]

    for (const file of required) {
      assert.isTrue(fileExists(file), `Missing user controller: ${file}`)
    }
  })

  test('profile controllers exist', ({ assert }) => {
    assert.isTrue(fileExists('app/controllers/users/show_profile_controller.ts'))
    assert.isTrue(fileExists('app/controllers/users/edit_profile_controller.ts'))
    assert.isTrue(fileExists('app/controllers/users/update_profile_details_controller.ts'))
    assert.isTrue(fileExists('app/controllers/users/view_user_profile_controller.ts'))
  })

  test('skill management controllers exist', ({ assert }) => {
    assert.isTrue(fileExists('app/controllers/users/add_profile_skill_controller.ts'))
    assert.isTrue(fileExists('app/controllers/users/update_profile_skill_controller.ts'))
    assert.isTrue(fileExists('app/controllers/users/remove_profile_skill_controller.ts'))
  })
})

// ============================================================================
// Frontend Pages Match Route Domains — ~6 tests
// ============================================================================
test.group('Match | Frontend Pages Match Route Domains', () => {
  const pagesDir = 'inertia/pages'

  test('task pages exist', ({ assert }) => {
    assert.isTrue(fileExists(`${pagesDir}/tasks`))
    assert.isTrue(fileExists(`${pagesDir}/tasks/index.svelte`))
  })

  test('organization pages exist', ({ assert }) => {
    assert.isTrue(fileExists(`${pagesDir}/organizations`))
  })

  test('review pages exist', ({ assert }) => {
    assert.isTrue(fileExists(`${pagesDir}/reviews`))
    assert.isTrue(fileExists(`${pagesDir}/reviews/pending.svelte`))
    assert.isTrue(fileExists(`${pagesDir}/reviews/show.svelte`))
    assert.isTrue(fileExists(`${pagesDir}/reviews/my-reviews.svelte`))
  })

  test('profile pages exist', ({ assert }) => {
    assert.isTrue(fileExists(`${pagesDir}/profile`))
    assert.isTrue(fileExists(`${pagesDir}/profile/show.svelte`))
    assert.isTrue(fileExists(`${pagesDir}/profile/edit.svelte`))
    assert.isTrue(fileExists(`${pagesDir}/profile/view.svelte`))
  })

  test('marketplace pages exist', ({ assert }) => {
    assert.isTrue(fileExists(`${pagesDir}/marketplace`))
    assert.isTrue(fileExists(`${pagesDir}/marketplace/tasks.svelte`))
  })

  test('conversation pages exist', ({ assert }) => {
    assert.isTrue(fileExists(`${pagesDir}/conversations`))
  })
})

// ============================================================================
// Route Content Validation — ~6 tests
// ============================================================================
test.group('Match | Route Content Validation', () => {
  test('task routes reference correct controllers', ({ assert }) => {
    const content = readFile('start/routes/tasks.ts')

    assert.isTrue(content.includes('ListTasksController'))
    assert.isTrue(content.includes('CreateTaskController'))
    assert.isTrue(content.includes('DeleteTaskController'))
    assert.isTrue(content.includes('EditTaskController'))
    assert.isTrue(content.includes('ShowTaskController'))
  })

  test('task routes have marketplace group', ({ assert }) => {
    const content = readFile('start/routes/tasks.ts')

    assert.isTrue(content.includes('marketplace'))
    assert.isTrue(content.includes('ListPublicTasksController'))
  })

  test('review routes reference correct controllers', ({ assert }) => {
    const content = readFile('start/routes/reviews.ts')

    assert.isTrue(content.includes('ListPendingReviewsController'))
    assert.isTrue(content.includes('ShowReviewController'))
    assert.isTrue(content.includes('SubmitReviewController'))
    assert.isTrue(content.includes('ConfirmReviewController'))
    assert.isTrue(content.includes('SubmitReverseReviewController'))
  })

  test('review routes have flagged reviews admin routes', ({ assert }) => {
    const content = readFile('start/routes/reviews.ts')

    assert.isTrue(content.includes('flagged'))
    assert.isTrue(content.includes('ListFlaggedReviewsController'))
    assert.isTrue(content.includes('ResolveFlaggedReviewController'))
  })

  test('user routes have profile routes', ({ assert }) => {
    const content = readFile('start/routes/users.ts')

    assert.isTrue(content.includes('profile'))
    assert.isTrue(content.includes('ShowProfileController'))
    assert.isTrue(content.includes('EditProfileController'))
    assert.isTrue(content.includes('UpdateProfileDetailsController'))
  })

  test('user routes have skill management routes', ({ assert }) => {
    const content = readFile('start/routes/users.ts')

    assert.isTrue(content.includes('AddProfileSkillController'))
    assert.isTrue(content.includes('UpdateProfileSkillController'))
    assert.isTrue(content.includes('RemoveProfileSkillController'))
  })
})

// ============================================================================
// Frontend Types Files Exist — ~5 tests
// ============================================================================
test.group('Match | Frontend Types Files Exist', () => {
  test('task types file exists', ({ assert }) => {
    assert.isTrue(fileExists('inertia/pages/tasks/types.svelte.ts'))
  })

  test('review types file exists', ({ assert }) => {
    assert.isTrue(fileExists('inertia/pages/reviews/types.svelte.ts'))
  })

  test('profile types file exists', ({ assert }) => {
    assert.isTrue(fileExists('inertia/pages/profile/types.svelte.ts'))
  })

  test('marketplace types file exists', ({ assert }) => {
    assert.isTrue(fileExists('inertia/pages/marketplace/types.svelte.ts'))
  })

  test('organization types file exists', ({ assert }) => {
    assert.isTrue(fileExists('inertia/pages/organizations/types/index.ts'))
  })
})
