import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/transmit'

import env from '#start/env'

export const transmitRedisEnabled =
  app.getEnvironment() === 'web' &&
  env.get('TRANSMIT_REDIS_ENABLED', env.get('NODE_ENV') !== 'test')
const pingIntervalMs = env.get('TRANSMIT_PING_INTERVAL_MS', 25_000)

export const transmitRuntimeLimits = {
  maxConnectionsPerUser: env.get('TRANSMIT_MAX_CONNECTIONS_PER_USER', 5),
  maxBufferedEvents: env.get('TRANSMIT_MAX_BUFFERED_EVENTS', 128),
  maxConnectionAgeMs: env.get('TRANSMIT_MAX_CONNECTION_AGE_MS', 900_000),
}

if (!Number.isSafeInteger(pingIntervalMs) || pingIntervalMs < 10_000 || pingIntervalMs > 60_000) {
  throw new RangeError('TRANSMIT_PING_INTERVAL_MS must be between 10000 and 60000')
}
if (
  !Number.isSafeInteger(transmitRuntimeLimits.maxConnectionsPerUser) ||
  transmitRuntimeLimits.maxConnectionsPerUser < 1 ||
  transmitRuntimeLimits.maxConnectionsPerUser > 20
) {
  throw new RangeError('TRANSMIT_MAX_CONNECTIONS_PER_USER must be between 1 and 20')
}
if (
  !Number.isSafeInteger(transmitRuntimeLimits.maxBufferedEvents) ||
  transmitRuntimeLimits.maxBufferedEvents < 16 ||
  transmitRuntimeLimits.maxBufferedEvents > 1_024
) {
  throw new RangeError('TRANSMIT_MAX_BUFFERED_EVENTS must be between 16 and 1024')
}
if (
  !Number.isSafeInteger(transmitRuntimeLimits.maxConnectionAgeMs) ||
  transmitRuntimeLimits.maxConnectionAgeMs < 60_000 ||
  transmitRuntimeLimits.maxConnectionAgeMs > 3_600_000
) {
  throw new RangeError('TRANSMIT_MAX_CONNECTION_AGE_MS must be between 60000 and 3600000')
}

export default defineConfig({
  pingInterval: pingIntervalMs,
  // Cross-instance delivery uses bounded notification-owned Redis envelopes.
  // Keeping Transmit local avoids its unbounded retry queue replaying stale signals.
  transport: null,
})
