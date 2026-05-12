import fs from 'node:fs'
import path from 'node:path'

import { test } from '@japa/runner'

const WORKSPACE_ROOT = path.resolve(import.meta.dirname, '../..')

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(WORKSPACE_ROOT, relativePath), 'utf-8')
}

function listFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(WORKSPACE_ROOT, relativeDir)
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true })

  return entries.flatMap((entry) => {
    const relativePath = path.posix.join(relativeDir, entry.name)

    if (entry.isDirectory()) {
      return listFiles(relativePath)
    }

    return [relativePath]
  })
}

function assertFilesDoNotMatch(
  assert: { notMatch: (value: string, pattern: RegExp) => void },
  files: string[],
  pattern: RegExp
) {
  for (const file of files) {
    assert.notMatch(readFile(file), pattern)
  }
}

function assertPathsExist(assert: { isTrue: (value: boolean) => void }, paths: string[]) {
  for (const relativePath of paths) {
    assert.isTrue(fs.existsSync(path.join(WORKSPACE_ROOT, relativePath)))
  }
}

test.group('Match | High-signal contracts', () => {
  test('task list filter keeps canonical task_status_id with legacy alias support', ({
    assert,
  }) => {
    const mapperContent = readFile('app/controllers/tasks/mappers/request/task_request_mapper.ts')
    const queryContent = readFile('app/actions/tasks/queries/get_tasks_index_page_query.ts')
    const filterHookContent = readFile('inertia/pages/tasks/hooks/use_task_filters.svelte.ts')
    const typesContent = readFile('inertia/pages/tasks/types.svelte.ts')

    assert.match(mapperContent, /request\.input\('task_status_id'\)/)
    assert.match(mapperContent, /request\.input\('status'\)/)
    assert.match(queryContent, /task_status_id:\s*dto\.task_status_id/)
    assert.match(queryContent, /status:\s*dto\.task_status_id/)
    assert.match(filterHookContent, /task_status_id/)
    assert.match(typesContent, /task_status_id/)
  })

  test('task controller mappers own HTTP input and serialization boundaries', ({ assert }) => {
    const taskRequestMapperContent = readFile(
      'app/controllers/tasks/mappers/request/task_request_mapper.ts'
    )
    const taskApplicationRequestMapperContent = readFile(
      'app/controllers/tasks/mappers/request/task_application_request_mapper.ts'
    )
    const responseMapperContent = readFile('app/controllers/tasks/mappers/response/shared.ts')
    const taskApplicationResponseMapperContent = readFile(
      'app/controllers/tasks/mappers/response/task_application_response_mapper.ts'
    )

    assert.match(taskRequestMapperContent, /export function buildGetTasksIndexPageInput/)
    assert.match(taskApplicationRequestMapperContent, /export function buildGetPublicTasksDTO/)
    assert.match(responseMapperContent, /serialize\(/)
    assert.match(
      taskApplicationResponseMapperContent,
      /status:\s*readString\(serialized, 'application_status', 'pending'\)/
    )
    assert.match(taskApplicationResponseMapperContent, /proposed_budget:\s*readNumber\(serialized, 'expected_rate'\)/)
    assertPathsExist(assert, [
      'app/controllers/tasks/mappers/request/task_request_mapper.ts',
      'app/controllers/tasks/mappers/request/task_application_request_mapper.ts',
      'app/controllers/tasks/mappers/response/shared.ts',
      'app/controllers/tasks/mappers/response/task_application_response_mapper.ts',
    ])
  })

  test('review controller mappers own HTTP input and serialization boundaries', ({ assert }) => {
    const reviewRequestMapperContent = readFile(
      'app/controllers/reviews/mappers/request/review_request_mapper.ts'
    )
    const reviewResponseSharedContent = readFile(
      'app/controllers/reviews/mappers/response/shared.ts'
    )
    const reviewResponseMapperContent = readFile(
      'app/controllers/reviews/mappers/response/review_response_mapper.ts'
    )

    assert.match(reviewRequestMapperContent, /export function buildSubmitSkillReviewDTO/)
    assert.match(reviewRequestMapperContent, /throwInvalidInput\(/)
    assert.match(reviewResponseSharedContent, /serialize\(/)
    assert.match(reviewResponseMapperContent, /mapReviewEvidenceCollectionApiBody/)
    assert.match(
      reviewResponseMapperContent,
      /flaggedReviews:\s*serializeCollectionForResponse\(result\.data\)/
    )
    assertPathsExist(assert, [
      'app/controllers/reviews/mappers/request/review_request_mapper.ts',
      'app/controllers/reviews/mappers/response/shared.ts',
      'app/controllers/reviews/mappers/response/review_response_mapper.ts',
    ])
  })

  test('project controller mappers own HTTP input and response envelopes', ({ assert }) => {
    const projectRequestMapperContent = readFile(
      'app/controllers/projects/mappers/request/project_request_mapper.ts'
    )
    const projectResponseSharedContent = readFile(
      'app/controllers/projects/mappers/response/shared.ts'
    )
    const projectResponseMapperContent = readFile(
      'app/controllers/projects/mappers/response/project_response_mapper.ts'
    )

    assert.match(projectRequestMapperContent, /export function buildCreateProjectDTO/)
    assert.match(projectRequestMapperContent, /export function buildDeleteProjectDTO/)
    assert.match(projectResponseSharedContent, /serialize\(/)
    assert.match(projectResponseMapperContent, /mapProjectMutationApiBody/)
    assert.isFalse(
      fs.existsSync(path.join(WORKSPACE_ROOT, 'app/controllers/projects/support/project_request_mappers.ts'))
    )
    assertPathsExist(assert, [
      'app/controllers/projects/mappers/request/project_request_mapper.ts',
      'app/controllers/projects/mappers/response/shared.ts',
      'app/controllers/projects/mappers/response/project_response_mapper.ts',
    ])
  })

  test('user controller mappers own HTTP input, normalization, and response boundaries', ({
    assert,
  }) => {
    const userRequestMapperContent = readFile(
      'app/controllers/users/mappers/request/user_request_mapper.ts'
    )
    const userResponseSharedContent = readFile('app/controllers/users/mappers/response/shared.ts')
    const userResponseMapperContent = readFile(
      'app/controllers/users/mappers/response/user_response_mapper.ts'
    )
    const userControllerFiles = [
      'app/controllers/users/add_profile_skill_controller.ts',
      'app/controllers/users/approve_user_controller.ts',
      'app/controllers/users/create_user_controller.ts',
      'app/controllers/users/delete_user_controller.ts',
      'app/controllers/users/edit_profile_controller.ts',
      'app/controllers/users/edit_user_controller.ts',
      'app/controllers/users/get_current_profile_snapshot_controller.ts',
      'app/controllers/users/get_profile_snapshot_history_controller.ts',
      'app/controllers/users/get_public_profile_snapshot_controller.ts',
      'app/controllers/users/list_users_controller.ts',
      'app/controllers/users/pending_approval_count_api_controller.ts',
      'app/controllers/users/pending_approval_users_api_controller.ts',
      'app/controllers/users/pending_approval_users_controller.ts',
      'app/controllers/users/publish_profile_snapshot_controller.ts',
      'app/controllers/users/remove_profile_skill_controller.ts',
      'app/controllers/users/rotate_profile_snapshot_share_link_controller.ts',
      'app/controllers/users/show_profile_controller.ts',
      'app/controllers/users/show_user_controller.ts',
      'app/controllers/users/store_user_controller.ts',
      'app/controllers/users/system_users_api_controller.ts',
      'app/controllers/users/update_profile_details_controller.ts',
      'app/controllers/users/update_profile_skill_controller.ts',
      'app/controllers/users/update_profile_snapshot_access_controller.ts',
      'app/controllers/users/update_user_controller.ts',
      'app/controllers/users/update_user_role_controller.ts',
      'app/controllers/users/view_user_profile_controller.ts',
    ]

    assert.match(userRequestMapperContent, /export function buildUsersListDTO/)
    assert.match(userRequestMapperContent, /request\.input\('role'\) \?\? request\.input\('system_role'\)/)
    assert.match(userResponseSharedContent, /serialize\(/)
    assert.match(userResponseMapperContent, /normalizePaginationMeta/)
    assert.match(userResponseMapperContent, /status_name:/)
    assert.match(userResponseMapperContent, /sanitizePublicSnapshot/)
    assert.match(userResponseMapperContent, /mapSuccessMessageApiBody/)
    assert.match(userResponseMapperContent, /trust_score:/)
    assertPathsExist(assert, [
      'app/controllers/users/mappers/request/user_request_mapper.ts',
      'app/controllers/users/mappers/response/shared.ts',
      'app/controllers/users/mappers/response/user_response_mapper.ts',
    ])

    assertFilesDoNotMatch(assert, userControllerFiles, /\.serialize\(/)
    assertFilesDoNotMatch(assert, userControllerFiles, /new [A-Za-z0-9_]+DTO\(/)
  })

  test('non-mapper controllers do not build DTOs or serialize models directly', ({ assert }) => {
    const controllerFiles = listFiles('app/controllers')
      .filter((file) => file.endsWith('.ts'))
      .filter((file) => !file.startsWith('app/controllers/http/'))
      .filter((file) => !file.includes('/mappers/'))

    for (const file of controllerFiles) {
      const content = readFile(file)
      assert.notMatch(content, /\.serialize\(/)
      assert.notMatch(content, /new [A-Za-z0-9_]+DTO\(/)
    }
  })

  test('controllers stay adapter-only, domain stays pure, and organization billing stays removed', ({
    assert,
  }) => {
    const controllerFiles = listFiles('app/controllers').filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.startsWith('app/controllers/http/') &&
        !file.includes('/mappers/')
    )
    const domainFiles = listFiles('app/domain').filter((file) => file.endsWith('.ts'))

    for (const file of controllerFiles) {
      const content = readFile(file)
      if (file === 'app/controllers/auth/social_auth_controller.ts') {
        assert.notMatch(content, /from ['"]#infra\/(?!logger\/auth_logger)/)
      } else {
        assert.notMatch(content, /from ['"]#infra\//)
      }
      assert.notMatch(content, /from ['"]#models\//)
    }

    for (const file of domainFiles) {
      const content = readFile(file)
      assert.notMatch(content, /from ['"]#infra\//)
      assert.notMatch(content, /from ['"]#models\//)
      assert.notMatch(content, /from ['"]@adonisjs\//)
      assert.notMatch(content, /from ['"]mongoose['"]/)
    }

    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'app/actions/organization')))
    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'app/controllers/organization')))
    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'app/infra/organization')))
    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'start/routes/organization.ts')))
    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'app/controllers/organization/billing')))
    assert.isFalse(fs.existsSync(path.join(WORKSPACE_ROOT, 'app/actions/organization/billing')))
    assert.isFalse(
      fs.existsSync(path.join(WORKSPACE_ROOT, 'inertia/pages/org/billing/index.svelte'))
    )

    const organizationRoutes = readFile('start/routes/organizations_current.ts')
    assert.notMatch(organizationRoutes, /\/billing\b/)
  })

  test('controllers outside mapper directories do not construct DTOs or serialize models inline', ({
    assert,
  }) => {
    const controllerFiles = listFiles('app/controllers').filter(
      (file) => file.endsWith('.ts') && !file.includes('/mappers/')
    )

    for (const file of controllerFiles) {
      const content = readFile(file)
      assert.notMatch(content, /new [A-Za-z0-9_]+DTO\(/)
      assert.notMatch(content, /\.serialize\(/)
    }

    assert.isTrue(
      fs.existsSync(
        path.join(WORKSPACE_ROOT, 'app/controllers/auth/mappers/request/auth_request_mapper.ts')
      )
    )
    assert.isTrue(
      fs.existsSync(
        path.join(
          WORKSPACE_ROOT,
          'app/controllers/settings/mappers/request/settings_request_mapper.ts'
        )
      )
    )
    assert.isTrue(
      fs.existsSync(
        path.join(
          WORKSPACE_ROOT,
          'app/controllers/organizations/mappers/request/organization_request_mapper.ts'
        )
      )
    )
    assert.isTrue(
      fs.existsSync(
        path.join(
          WORKSPACE_ROOT,
          'app/controllers/organizations/mappers/response/organization_response_mapper.ts'
        )
      )
    )
    assert.isTrue(
      fs.existsSync(
        path.join(
          WORKSPACE_ROOT,
          'app/controllers/tasks/mappers/request/task_status_request_mapper.ts'
        )
      )
    )
    assert.isTrue(
      fs.existsSync(
        path.join(
          WORKSPACE_ROOT,
          'app/controllers/tasks/mappers/response/task_status_response_mapper.ts'
        )
      )
    )
  })

  test('task and marketplace UI guardrails stay aligned with permission and layout rules', ({
    assert,
  }) => {
    const tasksIndexContent = readFile('inertia/pages/tasks/index.svelte')
    const applyModalContent = readFile(
      'inertia/pages/marketplace/components/apply_task_modal.svelte'
    )
    const appSidebarContent = readFile('inertia/components/layout/app_sidebar.svelte')

    assert.match(tasksIndexContent, /createTaskPermission=\{vm\.createTaskPermission\}/)
    assert.match(tasksIndexContent, /canCreateTask=\{vm\.createTaskPermission\.allowed\}/)
    assert.notMatch(appSidebarContent, /Quản Trị Tổ Chức/)
    assert.notMatch(appSidebarContent, /\/org\/tasks/)
    assert.notMatch(applyModalContent, /Mức giá đề xuất/)
    assert.notMatch(applyModalContent, /expected_rate/)
  })

  test('task version snapshots stay owned by commands and task:updated stays cache-only', ({
    assert,
  }) => {
    const updateTaskCommandContent = readFile('app/actions/tasks/commands/update_task_command.ts')
    const updateTaskPersistenceSupportContent = readFile(
      'app/actions/tasks/support/update_task_persistence_support.ts'
    )
    const cacheInvalidationContent = readFile('app/listeners/cache_invalidation_listener.ts')

    assert.match(updateTaskCommandContent, /persistTaskUpdateWithinTransaction/)
    assert.match(updateTaskPersistenceSupportContent, /createTaskVersionIfNeeded\(/)
    assert.match(cacheInvalidationContent, /emitter\.on\('task:updated'/)
  })
})
