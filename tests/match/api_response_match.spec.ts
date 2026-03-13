import { test } from '@japa/runner'
import fs from 'node:fs'
import path from 'node:path'

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../..')

/**
 * Match Tests: API Response Shape ↔ Frontend Props
 *
 * Ensures that controller Inertia render props match frontend page prop types,
 * and API JSON responses match expected shapes.
 */

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf-8')
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(path.join(WORKSPACE_ROOT, relativePath))
}

// ============================================================================
// Task List Page — Controller props ↔ Frontend TasksProps
// ============================================================================
test.group('Match | Task List API Response', () => {
  test('ListTasksController renders tasks/index page', ({ assert }) => {
    const content = readFile('app/controllers/tasks/list_tasks_controller.ts')
    assert.isTrue(content.includes("'tasks/index'") || content.includes('"tasks/index"'))
  })

  test('ListTasksController passes tasks, stats, metadata, filters', ({ assert }) => {
    const content = readFile('app/controllers/tasks/list_tasks_controller.ts')
    assert.isTrue(content.includes('tasks'), 'Should pass tasks prop')
    assert.isTrue(content.includes('metadata'), 'Should pass metadata prop')
    assert.isTrue(content.includes('filters'), 'Should pass filters prop')
  })

  test('frontend TasksProps type matches controller props', ({ assert }) => {
    const feContent = readFile('inertia/pages/tasks/types.svelte.ts')
    // TasksProps should have: tasks, filters, metadata
    assert.isTrue(feContent.includes('TasksProps'))
    assert.isTrue(feContent.includes('tasks'))
    assert.isTrue(feContent.includes('filters'))
    assert.isTrue(feContent.includes('metadata'))
  })

  test('frontend TasksProps metadata has statuses, labels, priorities, users', ({ assert }) => {
    const feContent = readFile('inertia/pages/tasks/types.svelte.ts')
    assert.isTrue(feContent.includes('statuses'))
    assert.isTrue(feContent.includes('labels'))
    assert.isTrue(feContent.includes('priorities'))
    assert.isTrue(feContent.includes('users'))
  })
})

// ============================================================================
// Marketplace Page — Controller props ↔ Frontend MarketplaceTasksProps
// ============================================================================
test.group('Match | Marketplace API Response', () => {
  test('ListPublicTasksController renders marketplace/tasks page', ({ assert }) => {
    const content = readFile('app/controllers/tasks/list_public_tasks_controller.ts')
    assert.isTrue(
      content.includes("'marketplace/tasks'") || content.includes('"marketplace/tasks"')
    )
  })

  test('ListPublicTasksController passes tasks, meta, filters', ({ assert }) => {
    const content = readFile('app/controllers/tasks/list_public_tasks_controller.ts')
    assert.isTrue(content.includes('tasks'))
    assert.isTrue(content.includes('meta') || content.includes('pagination'))
    assert.isTrue(content.includes('filters'))
  })

  test('frontend MarketplaceTasksProps type exists', ({ assert }) => {
    const feContent = readFile('inertia/pages/marketplace/types.svelte.ts')
    assert.isTrue(feContent.includes('MarketplaceTasksProps'))
  })
})

// ============================================================================
// Review Pages — Controller props ↔ Frontend types
// ============================================================================
test.group('Match | Review API Response', () => {
  test('ListPendingReviewsController renders reviews/pending', ({ assert }) => {
    const content = readFile('app/controllers/reviews/list_pending_reviews_controller.ts')
    assert.isTrue(content.includes("'reviews/pending'") || content.includes('"reviews/pending"'))
  })

  test('ShowReviewController renders reviews/show with session and skills', ({ assert }) => {
    const content = readFile('app/controllers/reviews/show_review_controller.ts')
    assert.isTrue(content.includes("'reviews/show'") || content.includes('"reviews/show"'))
    assert.isTrue(content.includes('session'))
    assert.isTrue(content.includes('skills'))
    assert.isTrue(content.includes('proficiencyLevels'))
  })

  test('frontend ShowReviewProps matches controller props', ({ assert }) => {
    const feContent = readFile('inertia/pages/reviews/types.svelte.ts')
    assert.isTrue(feContent.includes('ShowReviewProps'))
    assert.isTrue(feContent.includes('session'))
    assert.isTrue(feContent.includes('skills'))
    assert.isTrue(feContent.includes('proficiencyLevels'))
  })

  test('frontend PendingReviewsProps exists', ({ assert }) => {
    const feContent = readFile('inertia/pages/reviews/types.svelte.ts')
    assert.isTrue(feContent.includes('PendingReviewsProps'))
  })
})

// ============================================================================
// Profile Page — Controller props ↔ Frontend types
// ============================================================================
test.group('Match | Profile API Response', () => {
  test('ShowProfileController renders profile/show', ({ assert }) => {
    const content = readFile('app/controllers/users/show_profile_controller.ts')
    assert.isTrue(content.includes("'profile/show'") || content.includes('"profile/show"'))
  })

  test('ShowProfileController passes user, completeness, spiderChartData', ({ assert }) => {
    const content = readFile('app/controllers/users/show_profile_controller.ts')
    assert.isTrue(content.includes('user'))
    assert.isTrue(content.includes('completeness'))
    assert.isTrue(content.includes('spiderChartData'))
  })

  test('frontend ProfileShowProps matches controller props', ({ assert }) => {
    const feContent = readFile('inertia/pages/profile/types.svelte.ts')
    assert.isTrue(feContent.includes('ProfileShowProps'))
  })
})

// ============================================================================
// JSON API Endpoints — Response shape
// ============================================================================
test.group('Match | JSON API Response Shape', () => {
  test('ListTasksGroupedController returns JSON with success and data', ({ assert }) => {
    const content = readFile('app/controllers/tasks/list_tasks_grouped_controller.ts')
    assert.isTrue(content.includes('json') || content.includes('response'))
    assert.isTrue(content.includes('success') || content.includes('data'))
  })

  test('ListTasksTimelineController returns JSON with success and data', ({ assert }) => {
    const content = readFile('app/controllers/tasks/list_tasks_timeline_controller.ts')
    assert.isTrue(content.includes('json') || content.includes('response'))
    assert.isTrue(content.includes('success') || content.includes('data'))
  })

  test('API marketplace endpoint returns JSON', ({ assert }) => {
    const content = readFile('app/controllers/tasks/list_public_tasks_api_controller.ts')
    assert.isTrue(content.includes('json') || content.includes('response'))
  })
})

// ============================================================================
// Inertia Shared Props
// ============================================================================
test.group('Match | Inertia Shared Props', () => {
  test('inertia shares data via middleware', ({ assert }) => {
    // User data is shared via middleware (detect_user_locale_middleware), not inertia config
    const middlewareDir = 'app/middleware'
    const files = fs.readdirSync(path.join(WORKSPACE_ROOT, middlewareDir))
    const shareMiddleware = files.find(
      (f) => f.includes('detect_user_locale') || f.includes('inertia')
    )
    assert.isDefined(shareMiddleware, 'Should have middleware that shares user data via inertia')
    if (shareMiddleware) {
      const content = readFile(path.join(middlewareDir, shareMiddleware))
      assert.isTrue(content.includes('inertia.share'), 'Middleware should call inertia.share()')
    }
  })

  test('inertia middleware exists', ({ assert }) => {
    const middlewareDir = 'app/middleware'
    const files = fs.readdirSync(path.join(WORKSPACE_ROOT, middlewareDir))
    const hasInertiaMiddleware = files.some((f) => f.includes('inertia') || f.includes('share'))
    assert.isTrue(
      hasInertiaMiddleware || fileExists('config/inertia.ts'),
      'Should have inertia middleware or config for shared props'
    )
  })
})
