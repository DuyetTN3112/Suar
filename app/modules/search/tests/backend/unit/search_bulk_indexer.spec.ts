import type { Client, estypes } from '@elastic/elasticsearch'
import { test } from '@japa/runner'

import {
  bulkIndexSearchDocuments,
  SEARCH_BULK_MAX_DOCUMENTS,
  SearchBulkPartialFailureError,
} from '#modules/search/infra/adapters/projection-generation/search_bulk_indexer'

interface TestDocument {
  id: string
  title: string
}

test.group('Search bulk indexer', () => {
  test('chunks large rebuilds and refreshes only the final request', async ({ assert }) => {
    const requests: estypes.BulkRequest[] = []
    const client = {
      bulk: (request: estypes.BulkRequest) => {
        requests.push(request)
        return Promise.resolve({
          errors: false,
          items: [],
          took: 1,
        })
      },
    } as unknown as Client
    const documents = Array.from(
      { length: SEARCH_BULK_MAX_DOCUMENTS + 1 },
      (_, index): TestDocument => ({
        id: `document-${String(index)}`,
        title: `Document ${String(index)}`,
      })
    )

    await bulkIndexSearchDocuments(client, {
      indexName: 'suar_test_tasks',
      documents,
      documentId: (document) => document.id,
      refresh: true,
    })

    assert.lengthOf(requests, 2)
    assert.lengthOf(requests[0]?.operations ?? [], SEARCH_BULK_MAX_DOCUMENTS * 2)
    assert.lengthOf(requests[1]?.operations ?? [], 2)
    assert.isFalse(requests[0]?.refresh)
    assert.isTrue(requests[1]?.refresh)
  })

  test('fails closed when Elasticsearch reports a partial bulk rejection', async ({ assert }) => {
    const client = {
      bulk: () =>
        Promise.resolve({
          errors: true,
          took: 1,
          items: [
            {
              index: {
                _index: 'suar_test_tasks',
                _id: 'task-1',
                status: 429,
                error: {
                  type: 'es_rejected_execution_exception',
                  reason: 'queue full',
                },
              },
            },
          ],
        }),
    } as unknown as Client

    let capturedError: unknown
    try {
      await bulkIndexSearchDocuments(client, {
        indexName: 'suar_test_tasks',
        documents: [{ id: 'task-1', title: 'Task' }],
        documentId: (document) => document.id,
      })
    } catch (error) {
      capturedError = error
    }

    assert.instanceOf(capturedError, SearchBulkPartialFailureError)
    if (!(capturedError instanceof SearchBulkPartialFailureError)) {
      throw new Error('Expected a typed partial bulk failure')
    }
    assert.equal(capturedError.failedDocumentCount, 1)
    assert.deepEqual(capturedError.failures, [
      {
        status: 429,
        errorType: 'es_rejected_execution_exception',
      },
    ])
    assert.notInclude(capturedError.message, 'queue full')
  })
})
