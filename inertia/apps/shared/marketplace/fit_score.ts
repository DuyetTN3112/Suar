export function normalizeMarketplaceFitScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null

  const score = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(score)) return null

  return Math.min(100, Math.max(0, Math.round(score)))
}
