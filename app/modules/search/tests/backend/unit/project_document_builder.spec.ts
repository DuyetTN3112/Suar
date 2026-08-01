import { test } from '@japa/runner'

import type {
  ProjectSearchDocumentReader,
  ProjectSearchDocumentRecord,
} from '#modules/search/actions/ports/outbound/project_search_document_reader'
import { ProjectSearchDocumentBuilder } from '#modules/search/infra/projects/project_search_document_builder'

test.group('Unit | Project Search Document Builder', () => {
  test('returns no document when the project was hard-deleted', async ({
    assert,
  }) => {
    const builder = new ProjectSearchDocumentBuilder({
      findProjectSearchDocumentRecord: () => Promise.resolve(null),
    })

    assert.isNull(await builder.build('missing-project'))
  })

  test('maps project search record from domain reader into search document', async ({ assert }) => {
    const builder = new ProjectSearchDocumentBuilder({
      findProjectSearchDocumentRecord: (projectId: string) => {
        assert.equal(projectId, 'project-1')

        return Promise.resolve({
          projectId,
          name: 'Search Platform',
          description: 'Search platform initiative',
          visibility: 'team',
          status: 'active',
          organizationId: 'organization-1',
          creatorId: 'user-1',
          managerId: 'user-2',
          ownerId: 'user-3',
          tags: ['search', 'platform', 42],
          deletedAt: null,
          updatedAt: '2026-07-04T02:00:00.000Z',
        } satisfies ProjectSearchDocumentRecord)
      },
    } satisfies ProjectSearchDocumentReader)

    const document = await builder.build('project-1')

    assert.deepEqual(document, {
      project_id: 'project-1',
      name: 'Search Platform',
      description: 'Search platform initiative',
      visibility: 'team',
      status: 'active',
      organization_id: 'organization-1',
      creator_id: 'user-1',
      manager_id: 'user-2',
      owner_id: 'user-3',
      tags_text: 'search platform 42',
      deleted_at: null,
      updated_at: '2026-07-04T02:00:00.000Z',
    })
  })
})
