import { defineConfig, stores } from '@adonisjs/lock'

import env from '#start/env'

const lockConfig = defineConfig({
  default: env.get('LOCK_STORE'),
  stores: {
    /**
     * Redis store to save manage locks
     */
    redis: stores.redis({}),
    /**
     * Memory store could be used during
     * testing
     */
    memory: stores.memory(),
  },
})

export default lockConfig

declare module '@adonisjs/lock/types' {
  export interface LockStoresList extends InferLockStores<typeof lockConfig> {}
}
