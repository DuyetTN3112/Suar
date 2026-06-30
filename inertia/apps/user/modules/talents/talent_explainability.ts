export function formatTalentCoverageLabel(
  reviewedSkillsCount?: number,
  importedSkillsCount?: number
): string {
  const reviewed = typeof reviewedSkillsCount === 'number' ? reviewedSkillsCount : 0
  const imported = typeof importedSkillsCount === 'number' ? importedSkillsCount : 0

  return `${reviewed} reviewed · ${imported} imported`
}

export function formatTalentConfidenceLabel(
  signal?: 'low' | 'medium' | 'high' | null
): string | null {
  if (!signal) return null

  return `Confidence ${signal.charAt(0).toUpperCase()}${signal.slice(1)}`
}

export function formatTalentGovernanceLabel(underDisputeSkillsCount?: number): string | null {
  const count =
    typeof underDisputeSkillsCount === 'number' && Number.isFinite(underDisputeSkillsCount)
      ? underDisputeSkillsCount
      : 0

  if (count <= 0) {
    return null
  }

  return `${count} skill dispute`
}
