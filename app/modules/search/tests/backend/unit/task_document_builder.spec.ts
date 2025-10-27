import { test } from '@japa/runner'

import { TaskSearchDocumentBuilder } from '#modules/search/infra/tasks/task_search_document_builder'
import type {
  TaskSearchDocumentReader,
  TaskSearchDocumentRecord,
} from '#modules/tasks/application/ports/task_search_document_reader'

test.group('Unit | Task Search Document Builder', () => {
  test('maps task search record from domain reader into search document', async ({ assert }) => {
    const builder = new TaskSearchDocumentBuilder({
      findTaskSearchDocumentRecord: (taskId: string) => {
        assert.equal(taskId, 'task-1')

        return Promise.resolve({
          taskId,
          organizationId: 'organization-1',
          title: 'Search platform migration',
          description: 'Move marketplace retrieval to dedicated engine',
          acceptanceCriteria: 'All search flows use engine ids first',
          contextBackground: 'Search rollout phase',
          requiredSkills: [
            { skillId: 'skill-1', skillName: 'Elasticsearch' },
            { skillId: 'skill-2', skillName: 'TypeScript' },
          ],
          businessDomain: 'marketplace',
          problemCategory: 'search',
          taskType: 'feature',
          difficulty: 'hard',
          taskVisibility: 'external',
          assignedTo: null,
          deletedAt: '2026-07-04T00:00:00.000Z',
          updatedAt: '2026-07-04T01:00:00.000Z',
        } satisfies TaskSearchDocumentRecord)
      },
    } satisfies TaskSearchDocumentReader)

    const document = await builder.build('task-1')

    assert.deepEqual(document, {
      task_id: 'task-1',
      organization_id: 'organization-1',
      title: 'Search platform migration',
      description: 'Move marketplace retrieval to dedicated engine',
      acceptance_criteria: 'All search flows use engine ids first',
      context_background: 'Search rollout phase',
      required_skill_ids: ['skill-1', 'skill-2'],
      required_skills_text: 'Elasticsearch TypeScript',
      business_domain: 'marketplace',
      problem_category: 'search',
      task_type: 'feature',
      difficulty: 'hard',
      task_visibility: 'external',
      is_public: true,
      assigned_to: null,
      deleted_at: '2026-07-04T00:00:00.000Z',
      updated_at: '2026-07-04T01:00:00.000Z',
    })
  })
})
