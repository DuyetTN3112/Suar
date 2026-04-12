import type { ConnectOptions } from 'mongoose'

import env from '#start/env'

export interface MongoDbConfig {
  useDefaultConnection: boolean
  uri: string
  options: ConnectOptions
}

export interface MongooseConfig {
  mongodb: MongoDbConfig
}

export function defineConfig(config: MongooseConfig): MongooseConfig {
  return {
    mongodb: {
      useDefaultConnection: config.mongodb.useDefaultConnection,
      uri: config.mongodb.uri,
      options: config.mongodb.options,
    },
  }
}

/**
 * MongoDB Configuration
 *
 * Used for high-write, schema-flexible collections:
 *   - audit_logs (append-only, never joined, huge volume)
 *   - notifications (high write, simple reads, TTL auto-expire)
 *   - user_activity_logs (append-only, time-series)
 *
 * Using MONGODB_URL env variable. If not set, MongoDB features are disabled.
 *
 * UUIDv7 note: MongoDB 6.0+ supports UUID as BSON Binary subtype 4.
 * We use mongoose-uuid for UUID fields, but keep _id as ObjectId
 * (MongoDB's ObjectId is already time-sortable like UUIDv7).
 *
 * See: https://www.mongodb.com/docs/manual/reference/bson-types/#uuid
 */
const mongooseConfig = defineConfig({
  mongodb: {
    useDefaultConnection: true,
    uri: env.get('MONGODB_URL', ''),
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
      retryReads: true,
    },
  },
})

export default mongooseConfig
