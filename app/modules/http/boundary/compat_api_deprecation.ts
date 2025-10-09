import { readFileSync } from 'node:fs'
import path from 'node:path'

export interface CompatApiDeprecationPolicy {
  replacementPath: string
  sunsetDate: string
}

const LEGACY_COMPAT_SUNSET_DATE = '2026-12-31'
const DEPRECATED_ROUTE_POLICY_PATH = path.join(
  process.cwd(),
  'scripts',
  'api_deprecated_route_policy.json'
)

const EXCLUDED_COMPAT_PREFIXES = [
  '/api/v1/',
  '/api/admin/',
  '/api/public/',
  '/api/dev/',
  '/api/testing/',
  '/api/redis',
  '/api/search',
  '/api/telemetry',
  '/api/ui-events',
]

type CompatDeprecatedRouteEntry = {
  prefix: string
  replacementPath: string
  sunsetDate: string
}

let compatDeprecatedRouteEntriesCache: CompatDeprecatedRouteEntry[] | null = null

function matchesDeprecatedPrefix(routePath: string, prefix: string): boolean {
  return routePath === prefix || routePath.startsWith(`${prefix}/`)
}

function loadCompatDeprecatedRouteEntries(): CompatDeprecatedRouteEntry[] {
  if (compatDeprecatedRouteEntriesCache) {
    return compatDeprecatedRouteEntriesCache
  }

  const raw = readFileSync(DEPRECATED_ROUTE_POLICY_PATH, 'utf8')
  const payload = JSON.parse(raw) as { deprecatedPrefixes?: unknown } | null
  const entries: unknown[] = Array.isArray(payload?.deprecatedPrefixes) ? payload.deprecatedPrefixes : []

  compatDeprecatedRouteEntriesCache = entries
    .filter((entry: unknown): entry is CompatDeprecatedRouteEntry => {
      if (!entry || typeof entry !== 'object') {
        return false
      }

      const candidate = entry as Partial<CompatDeprecatedRouteEntry>

      return (
        typeof candidate.prefix === 'string' &&
        typeof candidate.replacementPath === 'string' &&
        typeof candidate.sunsetDate === 'string' &&
        candidate.prefix.startsWith('/api/') &&
        !candidate.prefix.startsWith('/api/v1/')
      )
    })
    .sort(
      (left: CompatDeprecatedRouteEntry, right: CompatDeprecatedRouteEntry) =>
        right.prefix.length - left.prefix.length
    )

  return compatDeprecatedRouteEntriesCache
}

function findCompatDeprecatedRouteEntry(pathname: string): CompatDeprecatedRouteEntry | null {
  return (
    loadCompatDeprecatedRouteEntries().find((entry) =>
      matchesDeprecatedPrefix(pathname, entry.prefix)
    ) ?? null
  )
}

export function isLegacyCompatApiPath(pathname: string): boolean {
  if (!pathname.startsWith('/api/')) {
    return false
  }

  return !EXCLUDED_COMPAT_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function resolveCompatApiReplacementPath(pathname: string): string | null {
  if (!isLegacyCompatApiPath(pathname)) {
    return null
  }

  const deprecatedEntry = findCompatDeprecatedRouteEntry(pathname)
  if (deprecatedEntry) {
    return pathname.replace(deprecatedEntry.prefix, deprecatedEntry.replacementPath)
  }

  return pathname.replace(/^\/api\b/, '/api/v1')
}

export function resolveCompatApiDeprecation(
  pathname: string
): CompatApiDeprecationPolicy | null {
  if (!isLegacyCompatApiPath(pathname)) {
    return null
  }

  const deprecatedEntry = findCompatDeprecatedRouteEntry(pathname)
  if (deprecatedEntry) {
    return {
      replacementPath: pathname.replace(deprecatedEntry.prefix, deprecatedEntry.replacementPath),
      sunsetDate: deprecatedEntry.sunsetDate,
    }
  }

  const replacementPath = pathname.replace(/^\/api\b/, '/api/v1')
  return {
    replacementPath,
    sunsetDate: LEGACY_COMPAT_SUNSET_DATE,
  }
}
