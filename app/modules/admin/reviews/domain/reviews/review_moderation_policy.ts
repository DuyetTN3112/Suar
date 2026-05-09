export type ReviewModerationPolicyResult =
  | { allowed: true; normalizedNotes: string }
  | {
      allowed: false
      reason: 'moderation_note_required' | 'flagged_review_already_resolved'
    }

export function decideFlaggedReviewResolution(input: {
  notes: string
  status: string
}): ReviewModerationPolicyResult {
  const normalizedNotes = input.notes.trim()
  if (!normalizedNotes) {
    return { allowed: false, reason: 'moderation_note_required' }
  }
  if (input.status !== 'pending') {
    return { allowed: false, reason: 'flagged_review_already_resolved' }
  }
  return { allowed: true, normalizedNotes }
}
