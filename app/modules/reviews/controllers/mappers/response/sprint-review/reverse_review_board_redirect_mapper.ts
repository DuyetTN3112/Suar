/** Maps a completed reverse-review workflow to its owning board URL. */
export type ReverseReviewBoardType = 'manager' | 'environment'

function isPersonalReverseReviewReferer(ctx: unknown, reviewType: ReverseReviewBoardType): boolean {
  if (!ctx || typeof ctx !== 'object' || !('request' in ctx)) return false
  const request = (ctx as { request?: { header?: (name: string) => unknown } }).request
  const referer = request?.header?.('referer') ?? request?.header?.('referrer')
  if (typeof referer !== 'string') return false

  try {
    const pathname = new URL(referer, 'https://suar.local').pathname
    return pathname === `/reviews/${reviewType === 'environment' ? 'environment' : 'assigners'}`
  } catch {
    return false
  }
}

export function resolveSprintReverseReviewBoardRedirectPath(
  ctx: unknown,
  reviewType: ReverseReviewBoardType,
  sprintId: string,
  projectId: string
): string {
  const projectBoard =
    reviewType === 'environment' ? 'reviews/environment' : 'reviews/assigners'
  if (isPersonalReverseReviewReferer(ctx, reviewType)) {
    return `/reviews/${reviewType === 'environment' ? 'environment' : 'assigners'}?sprint_id=${encodeURIComponent(sprintId)}`
  }

  return `/projects/${encodeURIComponent(projectId)}/${projectBoard}?sprint_id=${encodeURIComponent(sprintId)}`
}
