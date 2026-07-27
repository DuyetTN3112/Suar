import app from '@adonisjs/core/services/app'
import { test } from '@japa/runner'

import { skillTaxonomyProvider } from '#composition/skills/skill-taxonomy/skill_taxonomy_composition'
import SkillsCatalogProvider from '#composition/skills/skill-catalog/skills_catalog_provider'
import { SkillTaxonomyProvider } from '#modules/skills/infra/adapters/skill-catalog/skill_taxonomy_provider'

test.group('Skill taxonomy composition', () => {
  test('composes the real skills taxonomy provider with the authoritative catalog reader', ({
    assert,
  }) => {
    assert.instanceOf(skillTaxonomyProvider, SkillTaxonomyProvider)
    assert.equal(skillTaxonomyProvider.namespace, 'skills')
    assert.equal(skillTaxonomyProvider.fallbackLocale, 'en')
  })

  test('registers the composed provider as the application container binding', async ({ assert }) => {
    new SkillsCatalogProvider(app).register()

    assert.strictEqual(await app.container.make(SkillTaxonomyProvider), skillTaxonomyProvider)
  })
})
