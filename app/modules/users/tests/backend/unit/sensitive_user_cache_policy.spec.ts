import { readFileSync } from 'node:fs'
import path from 'node:path'

import { test } from '@japa/runner'

const SENSITIVE_QUERY_FILES = [
  'get_user_detail_query.ts',
  'get_user_skills_query.ts',
  'get_users_list_query.ts',
  'get_current_profile_snapshot_query.ts',
  'get_profile_snapshot_history_query.ts',
  'get_public_profile_snapshot_query.ts',
]

const CACHE_USAGE_PATTERNS = [
  /\bexecuteWithCache\s*\(/,
  /\bremember\s*\(/,
  /\bcacheStore\b/,
  /#modules\/cache\//,
]

test('sensitive user query families remain zero-cache by policy', ({ assert }) => {
  for (const fileName of SENSITIVE_QUERY_FILES) {
    const sourcePath = path.resolve(process.cwd(), 'app/modules/users/actions/queries', fileName)
    const source = readFileSync(sourcePath, 'utf8')

    for (const pattern of CACHE_USAGE_PATTERNS) {
      assert.notMatch(
        source,
        pattern,
        `${fileName} must not reintroduce cache usage matching ${pattern}`
      )
    }
  }
})
