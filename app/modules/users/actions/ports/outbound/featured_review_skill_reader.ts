/**
 * Users-owned projection of the only Skills facts needed by featured reviews.
 *
 * Keeping this consumer contract local prevents application queries from
 * depending on the Skills public DTO or its persistence model.
 */
export interface FeaturedReviewSkillSummary {
  id: string
  name: string
}

export interface FeaturedReviewSkillReader {
  findSkillSummariesByIds(skillIds: string[]): Promise<FeaturedReviewSkillSummary[]>
}
