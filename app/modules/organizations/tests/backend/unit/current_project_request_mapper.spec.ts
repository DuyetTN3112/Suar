import { test } from '@japa/runner'

import {
  buildCreateCurrentOrganizationProjectDTO,
  buildCurrentOrganizationProjectsListInput,
} from '#modules/organizations/controllers/current/projects/mappers/request/current_project_request_mapper'

function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
  }
}

test.group('Current project request mapper', () => {
  test('buildCreateCurrentOrganizationProjectDTO accepts canonical camelCase project fields', ({
    assert,
  }) => {
    const dto = buildCreateCurrentOrganizationProjectDTO(
      fakeRequest({
        name: 'Current Org Project',
        description: 'Industrialized boundary',
        status: 'in_progress',
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        managerId: 'manager-1',
        visibility: 'team',
      }) as never,
      'org-1'
    )

    assert.equal(dto.organization_id, 'org-1')
    assert.equal(dto.name, 'Current Org Project')
    assert.equal(dto.manager_id, 'manager-1')
    assert.isNotNull(dto.start_date)
    assert.isNotNull(dto.end_date)
    assert.equal(dto.visibility, 'team')
  })

  test('buildCurrentOrganizationProjectsListInput preserves normalized pagination', ({
    assert,
  }) => {
    const input = buildCurrentOrganizationProjectsListInput(
      fakeRequest({
        page: '0',
        limit: '999',
        search: 'alpha',
        status: 'active',
      }) as never
    )

    assert.deepEqual(input, {
      page: 1,
      perPage: 100,
      search: 'alpha',
      status: 'active',
    })
  })
})
