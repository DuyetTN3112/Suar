
export interface SkillScoreUpdatedEvent {
  userId: string
  skillId: string
  oldScore: number | null
  newScore: number
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'skill:score:updated': SkillScoreUpdatedEvent
  }
}
