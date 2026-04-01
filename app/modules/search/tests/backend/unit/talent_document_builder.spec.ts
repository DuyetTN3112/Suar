import { test } from '@japa/runner'

import { TalentSearchDocumentBuilder } from '#modules/search/infra/talents/talent_search_document_builder'
import type {
  TalentSearchDocumentReader,
  TalentSearchDocumentRecord,
} from '#modules/users/application/ports/talent_search_document_reader'

test.group('Unit | Talent Search Document Builder', () => {
  test('maps talent search record from domain reader into search document', async ({ assert }) => {
    const builder = new TalentSearchDocumentBuilder({
      findTalentSearchDocumentRecord: (userId: string) => {
        assert.equal(userId, 'user-1')

        return Promise.resolve({
          userId,
          username: 'elastic_architect',
          headline: 'Search platform engineer',
          bio: 'Distributed systems and search relevance specialist',
          status: 'active',
          isSearchable: true,
          skills: [
            { skillId: 'skill-1', skillName: 'Elasticsearch' },
            { skillId: 'skill-2', skillName: 'TypeScript' },
          ],
          trustScore: 87,
          completedTasks: 14,
          reviewedSkillsCount: 2,
          importedSkillsCount: 1,
          underDisputeSkillsCount: 0,
          latestConfidenceSignal: 'high',
          updatedAt: '2026-07-04T02:00:00.000Z',
        } satisfies TalentSearchDocumentRecord)
      },
    } satisfies TalentSearchDocumentReader)

    const document = await builder.build('user-1')

    assert.deepEqual(document, {
      user_id: 'user-1',
      username: 'elastic_architect',
      display_name: 'elastic_architect',
      headline: 'Search platform engineer',
      bio: 'Distributed systems and search relevance specialist',
      status: 'active',
      is_searchable: true,
      skill_ids: ['skill-1', 'skill-2'],
      skills_text: 'Elasticsearch TypeScript',
      business_domains: [],
      problem_categories: [],
      task_types: [],
      trust_score: 87,
      completed_tasks: 14,
      reviewed_skills_count: 2,
      imported_skills_count: 1,
      under_dispute_skills_count: 0,
      latest_confidence_signal: 'high',
      updated_at: '2026-07-04T02:00:00.000Z',
    })
  })
})
