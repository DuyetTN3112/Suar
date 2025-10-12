import { test } from '@japa/runner'

import { OrganizationRole } from '#modules/organizations/constants/organization_constants'
import * as membershipMutations from '#modules/organizations/infra/repositories/organization_user_repository/write/mutation_queries'
import Project from '#modules/projects/infra/models/project'
import ProjectMemberRepository from '#modules/projects/infra/repositories/project_member_repository'
import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

test.group('Integration | Project Create Staffing HTTP', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('project create wizard seeds role templates and assigns selected core member', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const coreMember = await UserFactory.create()
    const templateCode = `wizard_frontend_${Date.now()}`

    await membershipMutations.addMember({
      organization_id: org.id,
      user_id: coreMember.id,
      org_role: OrganizationRole.MEMBER,
    })

    await ProfessionalRoleRepository.createTemplate({
      code: templateCode,
      name: 'Frontend Engineer',
      is_active: true,
    })

    const response = await client.post('/projects').loginAs(owner).json({
      name: `Wizard Staffing ${Date.now()}`,
      description: 'HTTP create flow should support seed role + initial staffing',
      organizationId: org.id,
      status: 'pending',
      seedRoleTemplates: [templateCode],
      initialStaffingAssignments: [
        {
          userId: coreMember.id,
          templateCode,
        },
      ],
    })

    assert.include([200, 302], response.status())

    const project = await Project.query()
      .where('organization_id', org.id)
      .orderBy('created_at', 'desc')
      .firstOrFail()

    const projectRole = await ProfessionalRoleRepository.findProjectRoleByCode(
      project.id,
      templateCode
    )
    const membership = await ProjectMemberRepository.findMember(project.id, coreMember.id)

    assert.isNotNull(projectRole)
    assert.isNotNull(membership)
    assert.equal(membership?.project_professional_role_id, projectRole?.id ?? null)
  })
})
