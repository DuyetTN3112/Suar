import { test } from '@japa/runner'

import {
  type TaskProjectRole,
  TaskSkillReader,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import GetRoleRequirementsQuery from '#modules/tasks/actions/queries/get_role_requirements_query'

function makeSkillReader(projectId: string): TaskSkillReader {
  return new (class extends TaskSkillReader {
    listActiveSkills() {
      return Promise.resolve([])
    }

    listProjectTaskSkills() {
      return Promise.resolve([])
    }

    listActiveProficiencyLevels() {
      return Promise.resolve([])
    }

    findActiveSkillIds() {
      return Promise.resolve([])
    }

    findSkillSummariesByIds() {
      return Promise.resolve([])
    }

    resolveSkillIdsByCategoryCodes() {
      return Promise.resolve([])
    }

    findTaskRequirementReferenceFacts() {
      return Promise.resolve({ skills: [], proficiencyLevels: [] })
    }

    findProficiencyLevelsByIds(ids: string[]) {
      return Promise.resolve(
        ids.map((id) => ({
          id,
          code: 'l6',
          ordinal: 6,
          scaleId: 'scale-1',
        }))
      )
    }

    findProficiencyLevelById() {
      return Promise.resolve(null)
    }

    findRubricVersion() {
      return Promise.resolve(null)
    }

    findProjectRole(): Promise<TaskProjectRole | null> {
      return Promise.resolve({
        id: 'role-1',
        projectId,
        name: 'Backend Engineer',
        isActive: true,
        roleSkills: [
          {
            id: 'role-skill-1',
            projectSkillId: 'project-skill-1',
            skillId: 'skill-1',
            skillName: 'TypeScript',
            categoryCode: 'technology',
            minimumLevelId: 'level-1',
            targetLevelId: null,
            assessmentCeilingLevelId: null,
            isMandatory: true,
            importance: 'high',
            weight: 2,
            notes: 'Core delivery skill',
          },
        ],
      })
    }
  })()
}

test.group('Unit | Get role requirements query', () => {
  test('orchestrates role and level reads and returns the Tasks response DTO', async ({
    assert,
  }) => {
    const query = new GetRoleRequirementsQuery(makeSkillReader('project-1'))

    const result = await query.handle({
      projectId: 'project-1',
      roleId: 'role-1',
    })

    assert.deepInclude(result, {
      roleId: 'role-1',
      roleName: 'Backend Engineer',
    })
    assert.deepInclude(result.requirements[0], {
      skillId: 'skill-1',
      minimumLevelCode: 'l6',
      requiredLevelCode: 'l6',
      requirementSource: 'professional_role_prefill',
    })
  })

  test('fails closed when the role belongs to another project', async ({ assert }) => {
    const query = new GetRoleRequirementsQuery(makeSkillReader('project-2'))

    await assert.rejects(
      () =>
        query.handle({
          projectId: 'project-1',
          roleId: 'role-1',
        }),
      'Role not found in project'
    )
  })
})
