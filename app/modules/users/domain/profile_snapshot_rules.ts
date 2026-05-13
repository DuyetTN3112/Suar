export function buildProfileSnapshotSlug(input: {
  username: string | null
  userId: string
  version: number
  suffix: string
}): string {
  const base = (input.username ?? input.userId).toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `${base}-v${input.version}-${input.suffix}`
}

export function pickTopFrequencyKeys(frequency: Record<string, number>, limit: number): string[] {
  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key)
}
