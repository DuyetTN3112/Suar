import { test } from '@japa/runner'

import { OrganizationSearchProjectionCommands } from '#modules/search/actions/commands/projections/organization_search_projection_commands'
import type { OrganizationSearchSyncReader } from '#modules/search/actions/ports/outbound/organization_search_sync_reader'

test.group('Unit | Organization Search Projection Commands', () => {
  test('reindexAll consumes non-deleted organization ids from organization search sync reader', async ({
    assert,
  }) => {
    const calls: string[] = []
    const rawRepository = {
      ensureIndex: () => {
        calls.push('repo:ensure')
        return Promise.resolve()
      },
      resetIndex: () => {
        calls.push('repo:reset')
        return Promise.resolve()
      },
      replaceAllDocuments: (documents: Array<{ organization_id: string }>) => {
        calls.push(
          `repo:replace:${documents.map((document) => document.organization_id).join(',')}`
        )
        return Promise.resolve()
      },
      deleteDocument: () => Promise.resolve(),
      upsertDocument: () => Promise.resolve(),
    }
    const repository = rawRepository as unknown as ConstructorParameters<
      typeof OrganizationSearchProjectionCommands
    >[0]
    const rawBuilder = {
      build: (organizationId: string) => {
        calls.push(`builder:${organizationId}`)
        return Promise.resolve({
          organization_id: organizationId,
          deleted_at: organizationId === 'deleted-organization' ? '2026-01-01T00:00:00.000Z' : null,
        })
      },
    }
    const builder = rawBuilder as unknown as ConstructorParameters<
      typeof OrganizationSearchProjectionCommands
    >[1]

    const service = new OrganizationSearchProjectionCommands(
      repository,
      builder,
      {
        listNotDeletedOrganizationIds: () => {
          calls.push('reader:notDeleted')
          return Promise.resolve(['organization-1', 'deleted-organization', 'organization-2'])
        },
      } satisfies OrganizationSearchSyncReader,
      {
        isEnabled: () => true,
      }
    )

    const result = await service.reindexAll()

    assert.deepEqual(result, { indexed: 2, skipped: 1 })
    assert.deepEqual(calls, [
      'reader:notDeleted',
      'builder:organization-1',
      'builder:deleted-organization',
      'builder:organization-2',
      'repo:replace:organization-1,organization-2',
    ])
  })
})
