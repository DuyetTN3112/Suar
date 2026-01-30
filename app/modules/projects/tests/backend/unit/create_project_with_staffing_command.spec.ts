import { test } from '@japa/runner'

import CreateProjectWithStaffingCommand from '#modules/projects/actions/commands/create_project_with_staffing_command'
import type { AddProjectMemberDTO } from '#modules/projects/actions/dtos/request/add_project_member_dto'
import { CreateProjectDTO } from '#modules/projects/actions/dtos/request/create_project_dto'
import type { UpdateProjectMemberDTO } from '#modules/projects/actions/dtos/request/update_project_member_dto'
import type { ProjectMembershipSnapshot } from '#modules/projects/actions/ports/outbound/project_membership_repository'
import { makeSystemProjectActionContext } from '#modules/projects/actions/project_action_context'
import { ProjectRole } from '#modules/projects/public_contracts/project_constants'
import type { ProjectDetailRecord } from '#modules/projects/types/project_records'

const project: ProjectDetailRecord = {
  id: 'project-1',
  creator_id: 'actor-1',
  name: 'Platform Core',
  description: null,
  organization_id: 'org-1',
  start_date: null,
  end_date: null,
  status: 'pending',
  manager_id: 'actor-1',
  owner_id: 'actor-1',
  visibility: 'team',
  allow_external_contributors: false,
  approval_required_for_members: false,
  tags: null,
  custom_roles: null,
  deleted_at: null,
  created_at: '2026-07-29T00:00:00.000Z',
  updated_at: '2026-07-29T00:00:00.000Z',
}

test('create project with staffing command owns role seeding and member upserts', async ({
  assert,
}) => {
  const events: string[] = []
  const added: AddProjectMemberDTO[] = []
  const updated: UpdateProjectMemberDTO[] = []
  const existing: ProjectMembershipSnapshot = {
    projectId: project.id,
    userId: 'existing-user',
    projectRole: ProjectRole.MANAGER,
    projectProfessionalRoleId: null,
  }

  const command = new CreateProjectWithStaffingCommand(
    makeSystemProjectActionContext('actor-1'),
    {
      handle: () => {
        events.push('create')
        return Promise.resolve(project)
      },
    },
    {
      handle: (dto) => {
        events.push(`add:${dto.user_id}`)
        added.push(dto)
        return Promise.resolve()
      },
    },
    {
      handle: (dto) => {
        events.push(`update:${dto.user_id}`)
        updated.push(dto)
        return Promise.resolve()
      },
    },
    {
      seedTemplate: (_projectId, templateCode) => {
        events.push(`seed:${templateCode}`)
        return Promise.resolve()
      },
      findProjectRoleIdByCode: (_projectId, code) => Promise.resolve(`${code}-role`),
    },
    {
      findMember: (_projectId, userId) =>
        Promise.resolve(userId === existing.userId ? existing : null),
    }
  )

  const result = await command.handle({
    project: new CreateProjectDTO({
      name: project.name,
      organization_id: project.organization_id,
    }),
    seedRoleTemplates: ['backend', 'backend'],
    initialStaffingAssignments: [
      { userId: existing.userId, templateCode: 'backend' },
      { userId: 'new-user', templateCode: 'frontend' },
    ],
  })

  assert.strictEqual(result, project)
  assert.deepEqual(events, [
    'create',
    'seed:backend',
    'seed:frontend',
    'update:existing-user',
    'add:new-user',
  ])
  assert.equal(updated[0]?.project_role, ProjectRole.MANAGER)
  assert.equal(updated[0]?.project_professional_role_id, 'backend-role')
  assert.equal(added[0]?.project_role, ProjectRole.MEMBER)
  assert.equal(added[0]?.project_professional_role_id, 'frontend-role')
})
