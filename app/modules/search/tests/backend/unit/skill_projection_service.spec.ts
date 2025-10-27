import { test } from '@japa/runner'

import { searchConfig } from '#config/search'
import { SkillSearchProjectionService } from '#modules/search/actions/services/skill_search_projection_service'
import type { SkillSearchSyncReader } from '#modules/skills/application/ports/skill_search_sync_reader'

test.group('Unit | Skill Search Projection Service', (group) => {
  group.each.setup(() => {
    searchConfig.enabled = true
  })

  test('reindexAll consumes active skill ids from skill search sync reader', async ({ assert }) => {
    const calls: string[] = []
    const rawRepository = {
      ensureIndex: () => {
        calls.push('repo:ensure')
        return Promise.resolve()
      },
      resetIndex: () => {
        calls.push('repo:reset')
        return Promise.resolve()
      },
      bulkUpsertDocuments: (documents: Array<{ skill_id: string }>) => {
        calls.push(`repo:bulk:${documents.map((document) => document.skill_id).join(',')}`)
        return Promise.resolve()
      },
      deleteDocument: () => Promise.resolve(),
      upsertDocument: () => Promise.resolve(),
    }
    const repository = rawRepository as unknown as ConstructorParameters<typeof SkillSearchProjectionService>[0]
    const rawBuilder = {
      build: (skillId: string) => {
        calls.push(`builder:${skillId}`)
        return Promise.resolve({
          skill_id: skillId,
          is_active: skillId !== 'inactive-skill',
        })
      },
    }
    const builder = rawBuilder as unknown as ConstructorParameters<typeof SkillSearchProjectionService>[1]

    const service = new SkillSearchProjectionService(
      repository,
      builder,
      {
        listActiveSkillIds: () => {
          calls.push('reader:active')
          return Promise.resolve(['skill-1', 'inactive-skill', 'skill-2'])
        },
      } satisfies SkillSearchSyncReader
    )

    const result = await service.reindexAll()

    assert.deepEqual(result, { indexed: 2, skipped: 1 })
    assert.deepEqual(calls, [
      'repo:reset',
      'repo:ensure',
      'reader:active',
      'builder:skill-1',
      'builder:inactive-skill',
      'builder:skill-2',
      'repo:bulk:skill-1,skill-2',
    ])
  })
})
