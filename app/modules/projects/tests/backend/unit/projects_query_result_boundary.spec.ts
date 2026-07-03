import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { ProjectOrganizationReader } from '#modules/projects/actions/ports/outbound/project_external_dependencies'
import GetProjectSwitchTargetQuery from '#modules/projects/actions/queries/project-context/get_project_switch_target_query'
import GetProjectsIndexQuery from '#modules/projects/actions/queries/project-context/get_projects_index_query'

test.group('Projects query Result boundaries', () => {
  test('projects index preserves expected application failures', async ({ assert }) => {
    class TestOrganizationReader extends ProjectOrganizationReader {
      findOrganizationSummary() { return Promise.resolve(null) }
      getMembershipRole() { return Promise.resolve(null) }
      ensureApprovedMember() { return Promise.resolve() }
      isApprovedMember() { return Promise.resolve(false) }
      listOwnedOrganizations() { return Promise.resolve([]) }
      listOrganizationUsers() { return Promise.resolve([]) }
    }
    const query = new GetProjectsIndexQuery(
      { userId: null, ip: '127.0.0.1', userAgent: 'test', organizationId: null },
      new TestOrganizationReader(),
      { handle: () => Promise.reject(new NotFoundException('Projects unavailable')) }
    )

    const outcome = await query.executeAndWrap({})

    assert.isFalse(outcome.isSuccess())
    const error = outcome.getError()
    assert.instanceOf(error, NotFoundException)
  })

  test('switch target preserves expected application failures', async ({ assert }) => {
    const query = new GetProjectSwitchTargetQuery({
      find: () => Promise.reject(new NotFoundException('Project unavailable')),
    })

    const outcome = await query.executeAndWrap({
      projectId: 'project-1',
      organizationId: 'organization-1',
      userId: 'user-1',
    })

    assert.isFalse(outcome.isSuccess())
    const error = outcome.getError()
    assert.instanceOf(error, Error)
    assert.equal(error.message, 'Dự án không thuộc tổ chức hiện tại')
  })
})
