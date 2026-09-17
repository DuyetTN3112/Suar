import { test } from '@japa/runner'

import { SkillSearchProjectionCommands } from '#modules/search/actions/commands/projections/skill_search_projection_commands'
import type { SkillSearchSyncReader } from '#modules/search/actions/ports/outbound/skill_search_sync_reader'

test.group('Unit | Skill Search Projection Commands', () => {
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
      replaceAllDocuments: (documents: Array<{ skill_id: string }>) => {
        calls.push(`repo:replace:${documents.map((document) => document.skill_id).join(',')}`)
        return Promise.resolve()
      },
      deleteDocument: () => Promise.resolve(),
      upsertDocument: () => Promise.resolve(),
    }
    const repository = rawRepository as unknown as ConstructorParameters<
      typeof SkillSearchProjectionCommands
    >[0]
    const rawBuilder = {
      build: (skillId: string) => {
        calls.push(`builder:${skillId}`)
        return Promise.resolve({
          skill_id: skillId,
          is_active: skillId !== 'inactive-skill',
        })
      },
    }
    const builder = rawBuilder as unknown as ConstructorParameters<
      typeof SkillSearchProjectionCommands
    >[1]

    const service = new SkillSearchProjectionCommands(
      repository,
      builder,
      {
        listActiveSkillIds: () => {
          calls.push('reader:active')
          return Promise.resolve(['skill-1', 'inactive-skill', 'skill-2'])
        },
      } satisfies SkillSearchSyncReader,
      {
        isEnabled: () => true,
      }
    )

    const result = await service.reindexAll()

    assert.deepEqual(result, { indexed: 2, skipped: 1 })
    assert.deepEqual(calls, [
      'reader:active',
      'builder:skill-1',
      'builder:inactive-skill',
      'builder:skill-2',
      'repo:replace:skill-1,skill-2',
    ])
  })
})
