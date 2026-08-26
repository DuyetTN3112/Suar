import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

const CONTROLLER_FACTORY_CALLS = {
  'bookmarks/recruiter_bookmarks_controller.ts': 5,
  'recruiting/talents_search_controller.ts': 1,
  'recruiting/talent_detail_controller.ts': 1,
  'recruiting/org_talents_page_controller.ts': 2,
  'bookmarks/org_bookmarks_page_controller.ts': 1,
} as const

const BOOKMARK_USE_CASES = [
  'actions/commands/bookmarks/create_recruiter_bookmark_command.ts',
  'actions/commands/bookmarks/update_recruiter_bookmark_command.ts',
  'actions/commands/bookmarks/delete_recruiter_bookmark_command.ts',
  'actions/commands/bookmarks/delete_recruiter_bookmark_by_talent_command.ts',
  'actions/queries/bookmarks/list_recruiter_bookmarks_query.ts',
  'actions/queries/bookmarks/list_recruiter_bookmarks_workspace_query.ts',
] as const

test.group('Unit | Recruiting controller orchestration boundary', () => {
  for (const [controller, expectedFactoryCalls] of Object.entries(CONTROLLER_FACTORY_CALLS)) {
    test(`${controller} delegates access and workflow to one use case per action`, async ({
      assert,
    }) => {
      const source = await readFile(
        join(process.cwd(), 'app/modules/users/controllers', controller),
        'utf8'
      )
      const factoryCalls = source.match(/\.make[A-Z][A-Za-z0-9]+\(/gu)?.length ?? 0

      assert.equal(factoryCalls, expectedFactoryCalls)
      assert.notInclude(source, 'RecruitingDirectoryAccessQuery')
      assert.notInclude(source, '.canAccess(')
      assert.notInclude(source, '.canViewTalent(')
    })
  }

  for (const useCase of BOOKMARK_USE_CASES) {
    test(`${useCase} owns recruiting authorization`, async ({ assert }) => {
      const source = await readFile(join(process.cwd(), 'app/modules/users', useCase), 'utf8')
      assert.include(source, 'assertRecruitingDirectoryAccess')
    })
  }
})
