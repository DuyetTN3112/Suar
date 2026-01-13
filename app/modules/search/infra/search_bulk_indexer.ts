import type { Client, estypes } from '@elastic/elasticsearch'

export const SEARCH_BULK_MAX_DOCUMENTS = 500
export const SEARCH_BULK_MAX_BYTES = 5 * 1024 * 1024

interface SearchBulkFailure {
  status: number
  errorType: string
}

export class SearchBulkPartialFailureError extends Error {
  override readonly name = 'SearchBulkPartialFailureError'

  constructor(
    readonly failedDocumentCount: number,
    readonly failures: SearchBulkFailure[]
  ) {
    const summary = failures
      .slice(0, 3)
      .map((failure) => `${String(failure.status)}:${failure.errorType}`)
      .join(', ')
    super(
      `Elasticsearch bulk indexing rejected ${String(failedDocumentCount)} document(s)` +
        (summary ? ` (${summary})` : '')
    )
  }
}

function estimateOperationBytes<TDocument extends object>(
  indexName: string,
  documentId: string,
  document: TDocument
): number {
  return (
    Buffer.byteLength(
      JSON.stringify({
        index: {
          _index: indexName,
          _id: documentId,
        },
      }),
      'utf8'
    ) +
    Buffer.byteLength(JSON.stringify(document), 'utf8') +
    2
  )
}

function collectBulkFailures(response: estypes.BulkResponse): SearchBulkFailure[] {
  if (!response.errors) {
    return []
  }

  const failures = response.items.flatMap((item) => {
    const operation = item.index ?? item.create ?? item.update ?? item.delete
    if (!operation?.error) {
      return []
    }
    const errorType =
      typeof operation.error === 'string'
        ? 'bulk_operation_rejected'
        : operation.error.type || 'bulk_operation_rejected'
    return [{ status: operation.status, errorType }]
  })
  return failures.length > 0 ? failures : [{ status: 500, errorType: 'unclassified_bulk_failure' }]
}

export async function bulkIndexSearchDocuments<TDocument extends object>(
  client: Client,
  input: {
    indexName: string
    documents: TDocument[]
    documentId: (document: TDocument) => string
    refresh?: boolean
  }
): Promise<void> {
  if (input.documents.length === 0) {
    return
  }

  const chunks: TDocument[][] = []
  let currentChunk: TDocument[] = []
  let currentBytes = 0

  for (const document of input.documents) {
    const documentId = input.documentId(document)
    const operationBytes = estimateOperationBytes(input.indexName, documentId, document)
    if (operationBytes > SEARCH_BULK_MAX_BYTES) {
      throw new RangeError(
        `Search document ${documentId} exceeds the ${String(SEARCH_BULK_MAX_BYTES)} byte bulk budget`
      )
    }
    if (
      currentChunk.length >= SEARCH_BULK_MAX_DOCUMENTS ||
      (currentChunk.length > 0 && currentBytes + operationBytes > SEARCH_BULK_MAX_BYTES)
    ) {
      chunks.push(currentChunk)
      currentChunk = []
      currentBytes = 0
    }
    currentChunk.push(document)
    currentBytes += operationBytes
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk)
  }

  for (const [chunkIndex, chunk] of chunks.entries()) {
    const response = await client.bulk({
      refresh: input.refresh === true && chunkIndex === chunks.length - 1,
      operations: chunk.flatMap((document) => [
        {
          index: {
            _index: input.indexName,
            _id: input.documentId(document),
          },
        },
        document,
      ]),
    })
    const failures = collectBulkFailures(response)
    if (failures.length > 0) {
      throw new SearchBulkPartialFailureError(failures.length, failures)
    }
  }
}
