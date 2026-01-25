import env from '#start/env'

function boundedInteger(name: string, value: number, minimum: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${name} must be an integer between ${minimum} and ${maximum}`)
  }
  return value
}

export const errorReportingConfig = {
  insertTimeoutMs: boundedInteger(
    'ERROR_EVENT_INSERT_TIMEOUT_MS',
    env.get('ERROR_EVENT_INSERT_TIMEOUT_MS', 1_000),
    100,
    10_000
  ),
  maxInFlight: boundedInteger(
    'ERROR_EVENT_MAX_IN_FLIGHT',
    env.get('ERROR_EVENT_MAX_IN_FLIGHT', 4),
    1,
    32
  ),
  circuitOpenMs: boundedInteger(
    'ERROR_EVENT_CIRCUIT_OPEN_MS',
    env.get('ERROR_EVENT_CIRCUIT_OPEN_MS', 15_000),
    1_000,
    300_000
  ),
  shutdownDrainMs: boundedInteger(
    'ERROR_EVENT_SHUTDOWN_DRAIN_MS',
    env.get('ERROR_EVENT_SHUTDOWN_DRAIN_MS', 1_500),
    100,
    10_000
  ),
}
