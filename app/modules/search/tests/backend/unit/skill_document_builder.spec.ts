import { test } from '@japa/runner'

import type {
  SkillSearchDocumentReader,
  SkillSearchDocumentRecord,
} from '#modules/search/actions/ports/outbound/skill_search_document_reader'
import { SkillSearchDocumentBuilder } from '#modules/search/infra/adapters/entity-search/skills/skill_search_document_builder'

test.group('Unit | Skill Search Document Builder', () => {
  test('maps skill search record from domain reader into search document', async ({ assert }) => {
    const builder = new SkillSearchDocumentBuilder({
      findSkillSearchDocumentRecord: (skillId: string) => {
        assert.equal(skillId, 'skill-1')

        return Promise.resolve({
          skillId,
          skillCode: 'elasticsearch',
          skillName: 'Elasticsearch',
          categoryCode: 'technology',
          displayType: 'skill',
          description: 'Distributed search engine for large scale retrieval',
          isActive: true,
          updatedAt: '2026-07-04T00:00:00.000Z',
        } satisfies SkillSearchDocumentRecord)
      },
    } satisfies SkillSearchDocumentReader)

    const document = await builder.build('skill-1')

    assert.deepEqual(document, {
      skill_id: 'skill-1',
      skill_code: 'elasticsearch',
      skill_name: 'Elasticsearch',
      category_code: 'technology',
      display_type: 'skill',
      description: 'Distributed search engine for large scale retrieval',
      is_active: true,
      updated_at: '2026-07-04T00:00:00.000Z',
    })
  })
})
