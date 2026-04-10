import { test } from '@japa/runner'
import {
  buildDeleteProjectDTO,
  buildProjectsListDTO,
} from '#controllers/projects/mappers/request/project_request_mapper'
import {
  mapDeleteProjectApiBody,
  mapOrganizationProjectsPageProps,
  mapProjectDetailApiBody,
  mapProjectDetailPageProps,
  mapProjectMutationApiBody,
  mapProjectsIndexPageProps,
} from '#controllers/projects/mappers/response/project_response_mapper'

function serializable(payload: Record<string, unknown>) {
  return {
    serialize() {
      return payload
    },
  }
}

function fakeRequest(body: Record<string, unknown>) {
  return {
    input(key: string, fallback?: unknown) {
      return Object.hasOwn(body, key) ? body[key] : fallback
    },
  }
}

test.group('Project controller mappers', () => {
  test('project request mappers normalize list filters and delete payloads for controller adapters', ({
    assert,
  }) => {
    const listDto = buildProjectsListDTO(
      fakeRequest({
        page: '0',
        limit: '15',
        search: 'alpha',
        visibility: 'team',
        sort_by: 'name',
        sort_order: 'asc',
      }) as never,
      'org-1'
    )

    assert.equal(listDto.page, 1)
    assert.equal(listDto.limit, 15)
    assert.equal(listDto.organization_id, 'org-1')
    assert.equal(listDto.search, 'alpha')
    assert.equal(listDto.visibility, 'team')
    assert.equal(listDto.sort_by, 'name')
    assert.equal(listDto.sort_order, 'asc')

    const deleteDto = buildDeleteProjectDTO(
      fakeRequest({
        reason: '  cleanup stale project  ',
        permanent: 'true',
      }) as never,
      'project-1',
      'org-1'
    )

    assert.equal(deleteDto.project_id, 'project-1')
    assert.equal(deleteDto.reason, 'cleanup stale project')
    assert.isTrue(deleteDto.permanent)
    assert.equal(deleteDto.current_organization_id, 'org-1')
  })

  test('project response mappers keep page props and api envelopes stable', ({ assert }) => {
    const result = {
      data: [serializable({ id: 'project-1', name: 'Mapped project' })],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
      filters: {
        search: 'mapped',
      },
      stats: {
        total_projects: 1,
      },
    }
    const detail = {
      project: { id: 'project-1', name: 'Mapped project' },
      members: [],
      tasks: [],
      permissions: {
        canEdit: true,
      },
    }

    assert.deepEqual(mapProjectsIndexPageProps(result, true), {
      projects: [{ id: 'project-1', name: 'Mapped project' }],
      pagination: result.pagination,
      filters: result.filters,
      stats: result.stats,
      showOrganizationRequiredModal: true,
    })
    assert.deepEqual(mapProjectMutationApiBody(serializable({ id: 'project-1' })), {
      success: true,
      data: { id: 'project-1' },
    })
    assert.deepEqual(mapDeleteProjectApiBody('Dự án đã được xóa'), {
      success: true,
      message: 'Dự án đã được xóa',
    })
    assert.deepEqual(mapProjectDetailPageProps(detail), detail)
    assert.deepEqual(mapProjectDetailApiBody(detail), detail)
    assert.deepEqual(mapOrganizationProjectsPageProps(detail), detail)
  })
})
