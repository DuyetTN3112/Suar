import { Client, type ClientOptions } from '@elastic/elasticsearch'

import { searchAdminConfig, searchConfig } from '#config/search'

function adminAuth(): ClientOptions['auth'] {
  if (!searchAdminConfig.enabled) {
    return undefined
  }
  if (searchAdminConfig.apiKey) {
    return {
      apiKey: searchAdminConfig.apiKey,
    }
  }
  if (searchAdminConfig.username && searchAdminConfig.password) {
    return {
      username: searchAdminConfig.username,
      password: searchAdminConfig.password,
    }
  }
  if (searchAdminConfig.username || searchAdminConfig.password) {
    throw new RangeError(
      'ELASTICSEARCH_ADMIN_USERNAME and ELASTICSEARCH_ADMIN_PASSWORD must be configured together'
    )
  }
  return undefined
}

const auth = adminAuth()

export const searchIndexAdminClient = new Client({
  node: searchConfig.node,
  requestTimeout: searchConfig.requestTimeoutMs,
  maxRetries: searchConfig.maxRetries,
  ...(auth === undefined ? {} : { auth }),
})
