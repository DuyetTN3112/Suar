import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { test } from '@japa/runner'

const CONTROLLERS = [
  'project-skills/list_project_skills_controller.ts',
  'project-roles/list_project_roles_controller.ts',
  'project-skills/add_project_skill_controller.ts',
  'project-skills/update_project_skill_controller.ts',
  'project-skills/deactivate_project_skill_controller.ts',
  'project-roles/create_project_role_controller.ts',
  'project-roles/deactivate_project_role_controller.ts',
  'project-roles/update_project_role_skill_controller.ts',
] as const

test.group('Unit | Skill project controller orchestration boundary', () => {
  for (const controller of CONTROLLERS) {
    test(`${controller} delegates access and workflow to one application use case`, async ({
      assert,
    }) => {
      const source = await readFile(
        join(process.cwd(), 'app/modules/skills/controllers', controller),
        'utf8'
      )
      const factoryCalls = source.match(/\.make[A-Z][A-Za-z0-9]+\(/gu)?.length ?? 0

      assert.equal(factoryCalls, 1)
      assert.notInclude(source, 'SkillProjectAccessGuard')
      assert.notInclude(source, 'AuthorizeSkillProjectAccessCommand')
      assert.notInclude(source, '.requireUserId(')
    })
  }

  test('workspace use cases own authorization before delegation', async ({ assert }) => {
    const commands = await readFile(
      join(
        process.cwd(),
        'app/modules/skills/actions/commands/project-skills/skill_project_workspace_commands.ts'
      ),
      'utf8'
    )
    const queries = await readFile(
      join(process.cwd(), 'app/modules/skills/actions/queries/project-skills/skill_project_workspace_queries.ts'),
      'utf8'
    )

    assert.include(commands, 'authorizeWrite')
    assert.include(queries, 'this.authorize.execute')
  })
})
