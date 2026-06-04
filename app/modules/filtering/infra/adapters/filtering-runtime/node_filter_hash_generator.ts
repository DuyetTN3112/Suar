import { createHash } from 'node:crypto'

import type { FilterHashGenerator } from '#modules/filtering/domain/filtering-core/filter_hash'

export class NodeFilterHashGenerator implements FilterHashGenerator {
  hash(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex')
  }
}
