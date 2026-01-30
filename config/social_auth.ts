import env from '#start/env'

const providerRequestTimeoutMs = env.get('SOCIAL_AUTH_PROVIDER_TIMEOUT_MS', 8_000)
if (
  !Number.isSafeInteger(providerRequestTimeoutMs) ||
  providerRequestTimeoutMs < 500 ||
  providerRequestTimeoutMs > 60_000
) {
  throw new RangeError('SOCIAL_AUTH_PROVIDER_TIMEOUT_MS must be an integer between 500 and 60000')
}

export const socialAuthConfig = {
  providerRequestTimeoutMs,
}
