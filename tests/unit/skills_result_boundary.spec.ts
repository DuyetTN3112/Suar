import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import AddProjectSkillController from '#modules/skills/controllers/project-skills/add_project_skill_controller'
import CreateProjectRoleController from '#modules/skills/controllers/project-roles/create_project_role_controller'
import DeactivateProjectSkillController from '#modules/skills/controllers/project-skills/deactivate_project_skill_controller'
import DeactivateProjectRoleController from '#modules/skills/controllers/project-roles/deactivate_project_role_controller'
import ListProficiencyScalesController from '#modules/skills/controllers/rubric-and-proficiency/list_proficiency_scales_controller'
import ListProjectRolesController from '#modules/skills/controllers/project-roles/list_project_roles_controller'
import ListProjectSkillsController from '#modules/skills/controllers/project-skills/list_project_skills_controller'
import ListRoleTemplatesController from '#modules/skills/controllers/skill-catalog/list_role_templates_controller'
import ListSkillRubricsController from '#modules/skills/controllers/rubric-and-proficiency/list_skill_rubrics_controller'
import ShowProficiencyScaleController from '#modules/skills/controllers/rubric-and-proficiency/show_proficiency_scale_controller'
import ShowSkillRubricController from '#modules/skills/controllers/rubric-and-proficiency/show_skill_rubric_controller'
import UpdateProjectSkillController from '#modules/skills/controllers/project-skills/update_project_skill_controller'
import UpdateProjectRoleSkillController from '#modules/skills/controllers/project-roles/update_project_role_skill_controller'

function context() {
  return {
    auth: { user: { id: 'user-1' } },
    params: { projectId: 'project-1', skillId: 'skill-1', proficiencyScaleId: 'scale-1' },
    session: { get: () => 'org-1' },
    request: {
      input: () => undefined,
      ip: () => '127.0.0.1',
      header: () => 'unit-test',
    },
  }
}

async function assertFailure(run: () => Promise<unknown>, failure: Error, assert: { strictEqual: (actual: unknown, expected: unknown) => void }) {
  let thrown: unknown
  try {
    await run()
  } catch (error: unknown) {
    thrown = error
  }
  assert.strictEqual(thrown, failure)
}

test.group('Skills Result boundaries', () => {
  test('project skill and role controllers unwrap workspace query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Project skills access denied')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const actions = {
      makeListSkills: () => query,
      makeListRoles: () => query,
    }

    await assertFailure(
      () => new ListProjectSkillsController(actions as never).handle(context() as never),
      failure,
      assert
    )
    await assertFailure(
      () => new ListProjectRolesController(actions as never).handle(context() as never),
      failure,
      assert
    )
  })

  test('skill rubric list and show controllers unwrap query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Skill rubric access denied')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }

    await assertFailure(
      () => new ListSkillRubricsController(query as never).handle(context() as never),
      failure,
      assert
    )
    await assertFailure(
      () => new ShowSkillRubricController(query as never).handle(context() as never),
      failure,
      assert
    )
  })

  test('proficiency and role-template read controllers unwrap query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Skills catalog access denied')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }

    await assertFailure(
      () => new ListProficiencyScalesController(query as never).handle(context() as never),
      failure,
      assert
    )
    await assertFailure(
      () => new ShowProficiencyScaleController(query as never).handle(context() as never),
      failure,
      assert
    )
    await assertFailure(
      () => new ListRoleTemplatesController(query as never).handle(context() as never),
      failure,
      assert
    )
  })

  test('project skill mutation controllers unwrap workspace command failures', async ({ assert }) => {
    const failure = new ForbiddenException('Project skill mutation denied')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const actions = {
      makeAddSkill: () => command,
      makeUpdateSkill: () => command,
      makeDeactivateSkill: () => command,
      makeCreateRole: () => command,
      makeDeleteRoleTarget: () => command,
      makeUpsertRoleSkill: () => command,
    }
    const mutationContext = {
      ...context(),
      params: { projectId: 'project-1', projectSkillId: 'project-skill-1' },
      request: {
        input: (key: string) => {
          if (key === 'skillId') return 'skill-1'
          if (key === 'code') return 'custom-role'
          if (key === 'name') return 'Custom Role'
          return undefined
        },
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      response: { status: () => ({ json: () => undefined }), send: () => undefined },
    }

    await assertFailure(
      () => new AddProjectSkillController(actions as never).handle(mutationContext as never),
      failure,
      assert
    )
    await assertFailure(
      () => new UpdateProjectSkillController(actions as never).handle(mutationContext as never),
      failure,
      assert
    )
    await assertFailure(
      () => new DeactivateProjectSkillController(actions as never).handle(mutationContext as never),
      failure,
      assert
    )
    await assertFailure(
      () => new CreateProjectRoleController(actions as never).handle(mutationContext as never),
      failure,
      assert
    )
    await assertFailure(
      () => new DeactivateProjectRoleController(actions as never).handle({
        ...mutationContext,
        params: { projectId: 'project-1', roleId: 'role-1' },
      } as never),
      failure,
      assert
    )
    const roleSkillContext = {
      ...mutationContext,
      request: {
        ...mutationContext.request,
        input: (key: string) => (key === 'projectSkillId' ? 'project-skill-1' : undefined),
      },
      params: { projectId: 'project-1', roleId: 'role-1' },
    }
    await assertFailure(
      () => new UpdateProjectRoleSkillController(actions as never).handle(roleSkillContext as never),
      failure,
      assert
    )
  })
})
