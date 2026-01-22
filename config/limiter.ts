import { defineConfig, stores } from '@adonisjs/limiter'
import type { InferLimiters } from '@adonisjs/limiter/types'

import env from '#start/env'

const limiterConfig = defineConfig({
  // A process-local limiter can be bypassed by distributing requests across
  // replicas. Keep memory only for isolated tests/development overrides.
  default: env.get('LIMITER_STORE', env.get('NODE_ENV') === 'test' ? 'memory' : 'redis'),

  stores: {
    memory: stores.memory({}),
    redis: stores.redis({
      connectionName: 'main',
    }),
  },
})

export default limiterConfig

declare module '@adonisjs/limiter/types' {
  export interface LimitersList
    extends
      Record<string, import('@adonisjs/limiter/types').LimiterManagerStoreFactory>,
      InferLimiters<typeof limiterConfig> {}
}
