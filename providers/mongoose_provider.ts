import type { MongooseConfig } from '#config/mongoose'
import type { ApplicationService } from '@adonisjs/core/types'
import mongoose from 'mongoose'
import type { Connection } from 'mongoose'

/**
 * MongooseProvider
 *
 * AdonisJS provider that manages the Mongoose connection lifecycle.
 * Adapted from ancarat-bo's MongooseProvider.
 *
 * Only connects if MONGODB_URL is configured (graceful skip if not set).
 * This allows MySQL-only deployments to work without MongoDB.
 */
export default class MongooseProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Register the mongoose singleton in the IoC container.
   */
  register() {
    this.app.container.singleton('mongoose', () => {
      const mongoConfig = this.app.config.get<MongooseConfig>('mongoose')
      const uri = mongoConfig.mongodb.uri

      // If no URI configured, return null — features will degrade gracefully
      if (!uri) {
        return null
      }

      const conn = mongoConfig.mongodb.useDefaultConnection
        ? (mongoose.connect(uri, mongoConfig.mongodb.options), mongoose.connection)
        : mongoose.createConnection(uri, mongoConfig.mongodb.options)

      conn.set('strictQuery', false)

      return conn
    })
  }

  /**
   * Boot phase — no-op.
   */
  async boot() {}

  /**
   * Start phase — verify connection is established.
   */
  async start() {
    const conn = await this.app.container.make('mongoose')
    if (!conn) {
      const appLogger = await this.app.container.make('logger')
      appLogger.info('MongoDB not configured (MONGODB_URL not set). MongoDB features disabled.')
      return
    }

    const appLogger = await this.app.container.make('logger')
    try {
      await conn.asPromise()
      appLogger.info('Connected to MongoDB')
    } catch (err) {
      appLogger.error({ err }, 'Failed to connect to MongoDB')
    }
  }

  /**
   * Ready phase — no-op.
   */
  async ready() {}

  /**
   * Shutdown phase — disconnect from MongoDB.
   */
  async shutdown() {
    const conn = await this.app.container.make('mongoose')
    if (conn) {
      await conn.close()
    }
  }
}

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    mongoose: Connection | null
  }
}
