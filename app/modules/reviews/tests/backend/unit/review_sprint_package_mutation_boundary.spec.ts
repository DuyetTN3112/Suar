import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

const COMMANDS = [
  'close_project_sprint_review_command.ts',
  'submit_sprint_review_package_command.ts',
] as const

test.group('Review sprint package mutation boundary', () => {
  for (const command of COMMANDS) {
    test(`${command} owns policy without owning persistence`, async ({ assert }) => {
      const source = await readFile(
        join(process.cwd(), 'app/modules/reviews/actions/commands', command),
        'utf8'
      )

      assert.include(source, 'ReviewSprintPackageMutationUnitOfWork')
      assert.notInclude(source, '@adonisjs/lucid')
      assert.notInclude(source, '#modules/reviews/infra/')
      assert.notInclude(source, 'auditPublicApi')
      assert.notInclude(source, 'notificationFanoutPublicApi')
      assert.notInclude(source, 'rollbackWithoutMaskingOriginalError')
    })
  }

  test('Lucid adapter owns transaction, audit, and fanout staging', async ({ assert }) => {
    const source = await readFile(
      join(
        process.cwd(),
        'app/modules/reviews/infra/adapters/lucid_review_sprint_package_mutation_unit_of_work.ts'
      ),
      'utf8'
    )

    assert.include(source, 'db.transaction')
    assert.include(source, 'auditPublicApi.write')
    assert.include(source, 'notificationFanout.stage')
  })
})
