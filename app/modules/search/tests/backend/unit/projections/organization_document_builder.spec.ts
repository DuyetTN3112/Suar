import { test } from '@japa/runner'

import type {
  OrganizationSearchDocumentReader,
  OrganizationSearchDocumentRecord,
} from '#modules/search/actions/ports/outbound/organization_search_document_reader'
import { OrganizationSearchDocumentBuilder } from '#modules/search/infra/adapters/entity-search/organizations/organization_search_document_builder'

test.group('Unit | Organization Search Document Builder', () => {
  test('maps organization search record from domain reader into search document', async ({
    assert,
  }) => {
    const builder = new OrganizationSearchDocumentBuilder({
      findOrganizationSearchDocumentRecord: (organizationId: string) => {
        assert.equal(organizationId, 'organization-1')

        return Promise.resolve({
          organizationId,
          name: 'Elastic Labs',
          slug: 'elastic-labs',
          description: 'Search platform research collective',
          website: 'https://elastic.example',
          logo: 'https://elastic.example/logo.png',
          deletedAt: null,
          updatedAt: '2026-07-04T00:00:00.000Z',
        } satisfies OrganizationSearchDocumentRecord)
      },
    } satisfies OrganizationSearchDocumentReader)

    const document = await builder.build('organization-1')

    assert.deepEqual(document, {
      organization_id: 'organization-1',
      name: 'Elastic Labs',
      slug: 'elastic-labs',
      description: 'Search platform research collective',
      website: 'https://elastic.example',
      logo: 'https://elastic.example/logo.png',
      deleted_at: null,
      updated_at: '2026-07-04T00:00:00.000Z',
    })
  })
})
