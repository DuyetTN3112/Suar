/** Maps a completed reverse-review workflow to its owning board URL. */
export type ReverseReviewBoardType = 'manager' | 'environment'

export function resolveSprintReverseReviewBoardRedirectPath(
  _ctx: unknown,
  reviewType: ReverseReviewBoardType,
  sprintId: string,
  projectId: string
): string {
  const projectBoard =
    reviewType === 'environment' ? 'reviews/environment' : 'reviews/assigners'
  return `/projects/${encodeURIComponent(projectId)}/${projectBoard}?sprint_id=${encodeURIComponent(sprintId)}`
}
