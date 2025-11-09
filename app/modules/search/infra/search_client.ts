import { Client } from '@elastic/elasticsearch'

import { searchConfig } from '#config/search'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'

const auth =
  searchConfig.username && searchConfig.password
    ? {
        username: searchConfig.username,
        password: searchConfig.password,
      }
    : undefined

export const searchClient = new Client(omitUndefined({
  node: searchConfig.node,
  auth,
  requestTimeout: searchConfig.requestTimeoutMs,
}))

export function isSearchEnabled(): boolean {
  return searchConfig.enabled
}
