import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import AddProjectSkillController from '#modules/skills/controllers/project-skills/add_project_skill_controller'
import DeactivateProjectSkillController from '#modules/skills/controllers/project-skills/deactivate_project_skill_controller'
import ListProjectSkillsController from '#modules/skills/controllers/project-skills/list_project_skills_controller'
import UpdateProjectSkillController from '#modules/skills/controllers/project-skills/update_project_skill_controller'

function asNever<T = never>(value: unknown): T {
  return value as T
}

function context() {
  return {
    auth: { user: { id: 'user-1' } },
    params: { projectId: 'project-1', projectSkillId: 'project-skill-1' },
    session: { get: () => 'org-1' },
    request: {
      input: (key: string) => (key === 'skillId' ? 'skill-1' : undefined),
      ip: () => '127.0.0.1',
      header: () => 'unit-test',
    },
    response: { status: () => ({ send: () => undefined }) },
  }
}

async function assertFailure(
  run: () => Promise<unknown>,
  failure: Error,
  assert: { strictEqual: (actual: unknown, expected: unknown) => void }
) {
  let thrown: unknown
  try {
    await run()
  } catch (error: unknown) {
    thrown = error
  }
  assert.strictEqual(thrown, failure)
}

test.group('Project skills Result boundaries', () => {
  test('list unwraps expected failures from executeAndWrap', async ({ assert }) => {
    const failure = new ForbiddenException('Project skills access denied')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }

    await assertFailure(
      () =>
        new ListProjectSkillsController(asNever({ makeListSkills: () => query })).handle(
          asNever(context())
        ),
      failure,
      assert
    )
  })

  test('mutations unwrap expected failures from executeAndWrap', async ({ assert }) => {
    const failure = new ForbiddenException('Project skill mutation denied')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const actions = {
      makeAddSkill: () => command,
      makeUpdateSkill: () => command,
      makeDeactivateSkill: () => command,
    }

    await assertFailure(
      () => new AddProjectSkillController(asNever(actions)).handle(asNever(context())),
      failure,
      assert
    )
    await assertFailure(
      () => new UpdateProjectSkillController(asNever(actions)).handle(asNever(context())),
      failure,
      assert
    )
    await assertFailure(
      () => new DeactivateProjectSkillController(asNever(actions)).handle(asNever(context())),
      failure,
      assert
    )
  })

  test('unexpected exceptions propagate without conversion', async ({ assert }) => {
    const failure = new Error('database unavailable')
    const action = { executeAndWrap: () => Promise.reject(failure) }

    await assertFailure(
      () =>
        new ListProjectSkillsController(asNever({ makeListSkills: () => action })).handle(
          asNever(context())
        ),
      failure,
      assert
    )
    await assertFailure(
      () =>
        new AddProjectSkillController(asNever({ makeAddSkill: () => action })).handle(
          asNever(context())
        ),
      failure,
      assert
    )
    await assertFailure(
      () =>
        new UpdateProjectSkillController(asNever({ makeUpdateSkill: () => action })).handle(
          asNever(context())
        ),
      failure,
      assert
    )
    await assertFailure(
      () =>
        new DeactivateProjectSkillController(asNever({ makeDeactivateSkill: () => action })).handle(
          asNever(context())
        ),
      failure,
      assert
    )
  })

  test('success responses retain project-skill payload casing and no-content status', async ({
    assert,
  }) => {
    const projectSkill = {
      id: 'project-skill-1',
      project_id: 'project-1',
      skill_id: 'skill-1',
      is_active: true,
      is_selectable_for_tasks: false,
    }
    let statusCode: number | undefined
    const response = {
      status(code: number) {
        statusCode = code
        return this
      },
      created: (payload: unknown) => payload,
      send: () => undefined,
    }
    const successContext = { ...context(), response }

    const added = await new AddProjectSkillController(asNever({
      makeAddSkill: () => ({ executeAndWrap: () => Promise.resolve(Result.ok(projectSkill)) }),
    })).handle(asNever(successContext))
    assert.deepEqual(added, {
      data: {
        id: 'project-skill-1',
        projectId: 'project-1',
        skillId: 'skill-1',
        isActive: true,
        isSelectableForTasks: false,
      },
    })

    const updated = await new UpdateProjectSkillController(asNever({
      makeUpdateSkill: () => ({
        executeAndWrap: () => Promise.resolve(Result.ok({ projectSkill })),
      }),
    })).handle(asNever(successContext))
    assert.deepEqual(updated, {
      data: {
        id: 'project-skill-1',
        projectId: 'project-1',
        skillId: 'skill-1',
        isActive: true,
        isSelectableForTasks: false,
      },
    })

    const listed = await new ListProjectSkillsController(asNever({
      makeListSkills: () => ({
        executeAndWrap: () =>
          Promise.resolve(
            Result.ok([
              {
                ...projectSkill,
                skill: {
                  id: 'skill-1',
                  skill_code: 'TS',
                  skill_name: 'TypeScript',
                  category_code: 'dev',
                  display_type: 'technical',
                },
              },
            ])
          ),
      }),
    })).handle(asNever(successContext))
    assert.deepEqual(listed, {
      data: [
        {
          id: 'project-skill-1',
          projectId: 'project-1',
          skill: {
            id: 'skill-1',
            skillCode: 'TS',
            skillName: 'TypeScript',
            categoryCode: 'dev',
            displayType: 'technical',
          },
          displayNameOverride: undefined,
          descriptionOverride: undefined,
          rubricVersionId: undefined,
          isActive: true,
          isSelectableForTasks: false,
        },
      ],
    })

    await new DeactivateProjectSkillController(asNever({
      makeDeactivateSkill: () => ({
        executeAndWrap: () => Promise.resolve(Result.ok(projectSkill)),
      }),
    })).handle(asNever(successContext))
    assert.equal(statusCode, 204)
  })
})
