import { createHash } from 'node:crypto'

import type {
  PrivateCacheKeyDigestEncoding,
  PrivateCacheKeyDigestProvider,
} from '#modules/cache/public_contracts/cache_contract'

export class NodePrivateCacheKeyDigestProvider implements PrivateCacheKeyDigestProvider {
  digest(value: string, encoding: PrivateCacheKeyDigestEncoding = 'hex'): string {
    return createHash('sha256').update(value, 'utf8').digest(encoding)
  }
}
