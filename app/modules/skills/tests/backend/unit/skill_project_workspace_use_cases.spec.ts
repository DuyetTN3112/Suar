import { test } from '@japa/runner'

import type AddProjectSkillCommand from '#modules/skills/actions/commands/project-skills/add_project_skill_command'
import AuthorizeSkillProjectAccessCommand from '#modules/skills/actions/commands/project-skills/authorize_skill_project_access_command'
import {
  AddProjectSkillWorkspaceCommand,
  CreateProjectRoleWorkspaceCommand,
} from '#modules/skills/actions/commands/project-skills/skill_project_workspace_commands'
import type CloneProfessionalRoleTemplateCommand from '#modules/skills/actions/commands/skill-catalog/clone_professional_role_template_command'
import type CreateCustomProjectRoleCommand from '#modules/skills/actions/commands/project-roles/create_custom_project_role_command'
import type { SkillProjectAccessAuthorizer } from '#modules/skills/actions/ports/outbound/skill_project_access_authorizer'
import type ListProjectSkillsQuery from '#modules/skills/actions/queries/project-skills/list_project_skills_query'
import { ListProjectSkillsWorkspaceQuery } from '#modules/skills/actions/queries/project-skills/skill_project_workspace_queries'

const context = { userId: 'user-1', organizationId: 'org-1' }

test.group('Unit | Skill project workspace use cases', () => {
  test('denied reads never invoke the underlying query', async ({ assert }) => {
    let queryCalls = 0
    const deniedAuthorizer: SkillProjectAccessAuthorizer = {
      enforce: () => Promise.reject(new Error('denied')),
    }
    const query = new ListProjectSkillsWorkspaceQuery(
      context,
      new AuthorizeSkillProjectAccessCommand(deniedAuthorizer),
      {
        execute: () => {
          queryCalls += 1
          return Promise.resolve([])
        },
      } as unknown as ListProjectSkillsQuery
    )

    await assert.rejects(() => query.execute('project-1'), /denied/)
    assert.equal(queryCalls, 0)
  })

  test('authorized writes derive the actor from context', async ({ assert }) => {
    const calls: unknown[] = []
    const authorizer: SkillProjectAccessAuthorizer = {
      enforce: (input) => {
        calls.push({ type: 'authorize', input })
        return Promise.resolve()
      },
    }
    const command = new AddProjectSkillWorkspaceCommand(
      context,
      new AuthorizeSkillProjectAccessCommand(authorizer),
      {
        execute: (input: unknown) => {
          calls.push({ type: 'add', input })
          return Promise.resolve({ id: 'project-skill-1' } as never)
        },
      } as unknown as AddProjectSkillCommand
    )

    await command.execute({
      projectId: 'project-1',
      skillId: 'skill-1',
      auditContext: {} as never,
    })

    assert.deepEqual(calls, [
      {
        type: 'authorize',
        input: {
          projectId: 'project-1',
          userId: 'user-1',
          organizationId: 'org-1',
          writeMode: true,
        },
      },
      {
        type: 'add',
        input: {
          projectId: 'project-1',
          skillId: 'skill-1',
          addedBy: 'user-1',
          auditContext: {},
        },
      },
    ])
  })

  test('role creation branch is orchestrated after authorization', async ({ assert }) => {
    const calls: string[] = []
    const authorizer: SkillProjectAccessAuthorizer = {
      enforce: () => {
        calls.push('authorize')
        return Promise.resolve()
      },
    }
    const command = new CreateProjectRoleWorkspaceCommand(
      context,
      new AuthorizeSkillProjectAccessCommand(authorizer),
      {
        execute: () => {
          calls.push('clone')
          return Promise.resolve({ id: 'role-1' } as never)
        },
      } as unknown as CloneProfessionalRoleTemplateCommand,
      {
        execute: () => {
          calls.push('custom')
          return Promise.resolve({ id: 'role-2' } as never)
        },
      } as unknown as CreateCustomProjectRoleCommand
    )

    await command.execute({
      projectId: 'project-1',
      templateId: 'template-1',
      auditContext: {} as never,
    })

    assert.deepEqual(calls, ['authorize', 'clone'])
  })
})
