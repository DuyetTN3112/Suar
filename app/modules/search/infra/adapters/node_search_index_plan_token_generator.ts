import { createHash } from 'node:crypto'

import type { SearchIndexPlanTokenGenerator } from '#modules/search/actions/ports/outbound/search_index_administration_port'

export class NodeSearchIndexPlanTokenGenerator implements SearchIndexPlanTokenGenerator {
  generate(payload: unknown): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  }
}
