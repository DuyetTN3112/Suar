const LOOPBACK_HOST = 'loopback'

function isIpv4Loopback(host: string): boolean {
  const octets = host.split('.')
  return (
    octets.length === 4 &&
    octets[0] === '127' &&
    octets.every(
      (octet) => /^(0|[1-9]\d{0,2})$/.test(octet) && Number(octet) >= 0 && Number(octet) <= 255
    )
  )
}

function stripIpv6Brackets(host: string): string {
  if (host.startsWith('[') && host.endsWith(']')) {
    return host.slice(1, -1)
  }

  return host
}

/**
 * Canonicalize the host spellings that can safely be proven equivalent without
 * performing DNS or network I/O during application boot.
 *
 * Distinct arbitrary DNS names can still resolve to the same Redis service, so
 * production infrastructure must additionally prove endpoint identity.
 */
export function canonicalRedisHost(host: string): string {
  const normalized = stripIpv6Brackets(host.trim().toLowerCase()).replace(/\.$/, '')

  if (
    normalized === 'localhost' ||
    normalized === 'localhost.localdomain' ||
    normalized === 'ip6-localhost' ||
    normalized === '::1' ||
    normalized === '0:0:0:0:0:0:0:1' ||
    isIpv4Loopback(normalized)
  ) {
    return LOOPBACK_HOST
  }

  return normalized
}

export function areRedisEndpointAddressesEqual(
  first: { host: string; port: number | string },
  second: { host: string; port: number | string }
): boolean {
  const firstPort = Number(first.port)
  const secondPort = Number(second.port)

  return (
    canonicalRedisHost(first.host) === canonicalRedisHost(second.host) && firstPort === secondPort
  )
}
