import { Client } from '@elastic/elasticsearch'

import { searchConfig } from '#config/search'

const auth =
  searchConfig.username && searchConfig.password
    ? {
        username: searchConfig.username,
        password: searchConfig.password,
      }
    : undefined

export const searchClient = new Client({
  node: searchConfig.node,
  requestTimeout: searchConfig.requestTimeoutMs,
  maxRetries: searchConfig.maxRetries,
  ...(auth === undefined ? {} : { auth }),
})

export function isSearchEnabled(): boolean {
  return searchConfig.enabled
}
