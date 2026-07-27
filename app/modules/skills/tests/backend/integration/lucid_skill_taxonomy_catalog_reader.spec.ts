import { randomUUID } from 'node:crypto'

import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { LucidSkillTaxonomyCatalogReader } from '#modules/skills/infra/adapters/skill-catalog/lucid_skill_taxonomy_catalog_reader'
import Skill from '#modules/skills/infra/models/skill-catalog/skill'
import SkillAlias from '#modules/skills/infra/models/skill-catalog/skill_alias'
import {
  SKILL_DISPLAY_TYPES,
  SkillCategoryCode,
} from '#modules/skills/public_contracts/skill_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Lucid skill taxonomy catalog reader', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('projects active, deprecated, category, locale, and alias source truth without a duplicate taxonomy table', async ({
    assert,
  }) => {
    const activeId = randomUUID()
    const retiredId = randomUUID()
    await Skill.createMany([
      {
        id: activeId,
        category_code: SkillCategoryCode.ENGINEERING,
        display_type: SKILL_DISPLAY_TYPES.SPIDER_CHART,
        skill_code: `test_${activeId}`,
        skill_name: 'Contract testing',
        description: null,
        icon_url: null,
        is_active: true,
        sort_order: 98_001,
      },
      {
        id: retiredId,
        category_code: SkillCategoryCode.TECHNOLOGY,
        display_type: SKILL_DISPLAY_TYPES.SPIDER_CHART,
        skill_code: `test_${retiredId}`,
        skill_name: 'Legacy testing',
        description: null,
        icon_url: null,
        is_active: false,
        sort_order: 98_002,
      },
    ])
    await SkillAlias.createMany([
      {
        id: randomUUID(),
        skill_id: activeId,
        alias: 'CT',
        normalized_alias: 'ct',
        locale: 'en',
        source: 'manual',
        is_primary: true,
      },
      {
        id: randomUUID(),
        skill_id: activeId,
        alias: 'Contract assurance',
        normalized_alias: 'contractassurance',
        locale: 'en',
        source: 'ai_suggested',
        is_primary: false,
      },
    ])

    const snapshot = await new LucidSkillTaxonomyCatalogReader().loadSnapshot()
    const active = snapshot.terms.find(({ term }) => term.ref.termId === activeId)?.term
    const retired = snapshot.terms.find(({ term }) => term.ref.termId === retiredId)?.term
    const category = snapshot.terms.find(
      ({ term }) => term.ref.termId === 'category-engineering'
    )?.term

    assert.isAbove(snapshot.version, 0)
    assert.equal(active?.status, 'active')
    assert.deepEqual(active?.parentRefs, [{ namespace: 'skills', termId: 'category-engineering' }])
    assert.deepInclude(active?.aliases, {
      locale: 'en',
      value: 'CT',
      kind: 'abbreviation',
      reviewState: 'reviewed',
    })
    assert.deepInclude(active?.aliases, {
      locale: 'en',
      value: 'Contract assurance',
      kind: 'synonym',
      reviewState: 'suggested',
    })
    assert.equal(retired?.status, 'deprecated')
    assert.deepEqual(category?.labels, { en: 'Engineering', vi: 'Kỹ thuật phần mềm' })
    assert.equal(snapshot.organizationVocabulary, 'unsupported')
  })

  test('uses a monotonic revision for updates, alias deletion, skill deletion, and reactivation', async ({
    assert,
  }) => {
    const skill = await Skill.create({
      id: randomUUID(),
      category_code: SkillCategoryCode.ENGINEERING,
      display_type: SKILL_DISPLAY_TYPES.SPIDER_CHART,
      skill_code: `test_revision_${randomUUID()}`,
      skill_name: 'Revision probe',
      description: null,
      icon_url: null,
      is_active: false,
      sort_order: 98_100,
    })
    const alias = await SkillAlias.create({
      id: randomUUID(),
      skill_id: skill.id,
      alias: 'Revision alias',
      normalized_alias: 'revisionalias',
      locale: 'en',
      source: 'manual',
      is_primary: false,
    })
    const reader = new LucidSkillTaxonomyCatalogReader()
    const initial = await reader.loadSnapshot()
    assert.equal(
      initial.terms.find(({ term }) => term.ref.termId === skill.id)?.term.status,
      'deprecated'
    )

    await db.rawQuery('UPDATE skills SET sort_order = sort_order WHERE id = ?', [skill.id])
    const afterSameValueUpdate = await reader.loadSnapshot()
    assert.isAbove(afterSameValueUpdate.version, initial.version)

    await alias.delete()
    const afterAliasDelete = await reader.loadSnapshot()
    assert.isAbove(afterAliasDelete.version, afterSameValueUpdate.version)

    skill.is_active = true
    await skill.save()
    const afterReactivation = await reader.loadSnapshot()
    assert.isAbove(afterReactivation.version, afterAliasDelete.version)
    assert.equal(
      afterReactivation.terms.find(({ term }) => term.ref.termId === skill.id)?.term.status,
      'active'
    )

    await skill.delete()
    const afterSkillDelete = await reader.loadSnapshot()
    assert.isAbove(afterSkillDelete.version, afterReactivation.version)
    assert.notExists(afterSkillDelete.terms.find(({ term }) => term.ref.termId === skill.id))
  })

  test('loads a transactionally consistent catalog with a constant SQL query budget', async ({
    assert,
  }) => {
    let queryCount = 0
    const unsubscribe = emitter.on('db:query', () => {
      queryCount += 1
    })

    try {
      await new LucidSkillTaxonomyCatalogReader().loadSnapshot()
    } finally {
      unsubscribe()
    }

    assert.isAtMost(queryCount, 5)
  })
})
