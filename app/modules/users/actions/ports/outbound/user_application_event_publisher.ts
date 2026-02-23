export interface UserSkillScoreUpdatedEvent {
  userId: string
  skillId: string
  oldScore: number | null
  newScore: number
}

export interface UserApplicationEventPublisher {
  publishSkillScoreUpdated(event: UserSkillScoreUpdatedEvent): Promise<void>
  invalidateUserPermissionCache(userId: string): Promise<void>
}
