import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { test } from '@japa/runner'

import { canAccessSystemUserAdministration } from '#modules/authorization/domain/system_user_access_policy'
import { SystemRoleName } from '#modules/users/public_contracts/user_constants'

const readSource = (path: string): string => readFileSync(join(process.cwd(), path), 'utf8')

test.group('System and User realm separation', () => {
  test('System administration accepts only a System principal', ({ assert }) => {
    assert.isTrue(
      canAccessSystemUserAdministration({
        actorSystemRole: SystemRoleName.SYSTEM_ADMIN,
      }).allowed
    )
    assert.isFalse(
      canAccessSystemUserAdministration({
        actorSystemRole: null,
      }).allowed
    )
  })

  test('Project and Task permission contexts contain no System role', ({ assert }) => {
    for (const sourcePath of [
      'app/modules/projects/domain/project_types.ts',
      'app/modules/projects/domain/project_permission_policy.ts',
      'app/modules/tasks/domain/task_types.ts',
      'app/modules/tasks/domain/task_permission_policy.ts',
    ]) {
      const source = readSource(sourcePath)
      assert.notInclude(source, 'actorSystemRole')
      assert.notInclude(source, 'isSystemAdmin')
    }

    assert.notInclude(
      readSource('app/modules/authorization/actions/permission/cross_module_permission_checker.ts'),
      'isSystemSuperadmin'
    )

    const reviewPolicy = readSource('app/modules/reviews/domain/review_policy.ts')
    assert.notInclude(reviewPolicy, 'actorSystemRole')
    assert.notInclude(reviewPolicy, 'system_admin')
    for (const reviewActorAccessSource of [
      'app/modules/reviews/actions/ports/outbound/review_session_readers.ts',
      'app/modules/reviews/infra/adapters/lucid_review_session_actor_access_reader.ts',
    ]) {
      const source = readSource(reviewActorAccessSource)
      assert.notInclude(source, 'actorSystemRole')
      assert.notInclude(source, 'system_role')
    }
  })

  test('User and Organization frontends expose no legacy user-administration module', ({
    assert,
  }) => {
    assert.isFalse(existsSync(join(process.cwd(), 'inertia/apps/user/modules/users/index.svelte')))
    assert.isFalse(existsSync(join(process.cwd(), 'inertia/apps/org/modules/users/index.svelte')))

    const userRoutes = readSource('start/routes/users.ts')
    assert.notInclude(userRoutes, 'SystemUsersApiController')
    assert.notInclude(userRoutes, "router.post('/users'")
    assert.notInclude(userRoutes, "router.put('/users/:userId'")
    assert.notInclude(userRoutes, "router.delete('/users/:userId'")
  })

  test('System Admin frontend exposes no User workspace route helpers or switcher', ({
    assert,
  }) => {
    const adminRoutes = readSource('inertia/apps/admin/shared/constants/routes.ts')
    for (const userWorkspacePath of [
      "'/tasks",
      "'/projects",
      "'/org",
      "'/profile",
      "'/settings",
      "'/switch-organization",
      "'/switch-project",
    ]) {
      assert.notInclude(adminRoutes, userWorkspacePath)
    }

    assert.isFalse(
      existsSync(join(process.cwd(), 'inertia/apps/admin/shared/lib/workspace_switcher.ts'))
    )
    assert.isFalse(
      existsSync(join(process.cwd(), 'inertia/apps/admin/shared/constants/settings.ts'))
    )

    const adminDisputeRoom = readSource('inertia/apps/admin/modules/disputes/show.svelte')
    assert.notInclude(adminDisputeRoom, '`/api/reviews/disputes/')
    assert.include(adminDisputeRoom, '`/api/admin/reviews/disputes/')
  })

  test('retired review, history, inbox, and Organization dispute pages stay unregistered', ({
    assert,
  }) => {
    const routes = readSource('start/routes/reviews.ts')

    for (const retiredPath of [
      '/reviews/task-board',
      '/reviews/pending',
      '/reviews/sprint-reverse-board',
      '/reviews/reverse-reviews',
      '/org/reviews/task-board',
      '/org/reviews/sprint-reverse-board',
      '/org/reverse-reviews',
      '/org/disputes',
      '/admin/reverse-reviews',
      '/reviews/sprint-disputes/:disputeId',
    ]) {
      assert.notInclude(routes, `.get('${retiredPath}'`)
    }

    assert.notInclude(routes, 'api.admin.reverse_reviews.index')
    assert.notInclude(routes, 'api.me.reverse_reviews.index')
    assert.notInclude(routes, 'api.v1.me.reverse_reviews.index')
    assert.notInclude(routes, 'organizations.current.reverse_reviews')
    assert.notInclude(routes, ".get('/reviews/:reviewId'")
    assert.notInclude(routes, "as('reviews.disputes.show')")
  })

  test('legacy Task and Organization Task page controllers only enter the Project board', ({
    assert,
  }) => {
    for (const sourcePath of [
      'app/modules/tasks/controllers/create_task_controller.ts',
      'app/modules/tasks/controllers/show_task_controller.ts',
      'app/modules/tasks/controllers/edit_task_controller.ts',
      'app/modules/organizations/tasks/controllers/list_tasks_controller.ts',
      'app/modules/organizations/tasks/controllers/show_task_controller.ts',
    ]) {
      const source = readSource(sourcePath)
      assert.include(source, '/projects/')
      assert.notInclude(source, "inertia.render('tasks/")
      assert.notInclude(source, "ctx.inertia.render('tasks/")
    }
  })
})
