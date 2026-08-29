import { test } from '@japa/runner'

import { searchPublicApi } from '#composition/search/public-api/search_public_api_composition'
import { userExternalDependencies } from '#composition/users/user-external-dependencies/user_external_dependencies_composition'
import { userTalentRepository } from '#composition/users/user-persistence/user_persistence_composition'
import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import { LucidSkillTaxonomyCatalogReader } from '#modules/skills/infra/adapters/skill-catalog/lucid_skill_taxonomy_catalog_reader'
import type { TalentSkillTaxonomyCatalogReader } from '#modules/users/actions/ports/outbound/talent_skill_taxonomy_catalog_reader'
import { LucidTalentSearchDocumentReader } from '#modules/users/infra/adapters/talent/lucid_talent_search_document_reader'
import type { UserProfileSettings } from '#modules/users/types/user_profile_data'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  SkillFactory,
  UserFactory,
  UserSkillFactory,
} from '#tests/helpers/factories'

process.env['ELASTICSEARCH_ENABLED'] = 'true'
process.env['ELASTICSEARCH_NODE'] = process.env['ELASTICSEARCH_NODE'] ?? 'http://127.0.0.1:9200'

function buildProfileSettings(overrides: Partial<UserProfileSettings>): UserProfileSettings {
  return {
    is_searchable: false,
    show_contact_info: false,
    show_organizations: true,
    show_projects: true,
    show_spider_chart: true,
    show_technical_skills: true,
    custom_headline: null,
    preferred_job_types: [],
    preferred_locations: [],
    min_salary_expectation: null,
    salary_currency: 'USD',
    available_from: null,
    ...overrides,
  }
}

test.group('Integration | Talent Search Engine', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('builds prefixed talent index names', async ({ assert }) => {
    const { buildTalentSearchIndexName, buildTalentSearchPhysicalIndexName } =
      await import('#modules/search/infra/adapters/index-administration/search_index_names')
    const testIndexPrefix = process.env['ELASTICSEARCH_TEST_INDEX_PREFIX']
    if (!testIndexPrefix) {
      throw new Error('ELASTICSEARCH_TEST_INDEX_PREFIX is required for integration tests')
    }

    assert.equal(buildTalentSearchIndexName(), `${testIndexPrefix}talents`)
    assert.equal(buildTalentSearchPhysicalIndexName(), `${testIndexPrefix}talents_v1`)
  })

  test('indexes searchable talents and retrieves them by keyword', async ({ assert }) => {
    const searchableTalent = await UserFactory.create({
      username: 'elastic_architect',
    })
    const hiddenTalent = await UserFactory.create({
      username: 'hidden_architect',
    })
    const skill = await SkillFactory.create({ skill_name: 'Elasticsearch' })

    await searchableTalent
      .merge({
        profile_settings: buildProfileSettings({
          is_searchable: true,
          custom_headline: 'Search platform engineer',
          available_from: '2026-09-15',
        }),
      })
      .save()
    await hiddenTalent
      .merge({
        profile_settings: buildProfileSettings({
          is_searchable: false,
          custom_headline: 'Hidden profile',
        }),
      })
      .save()

    await UserSkillFactory.create({
      user_id: searchableTalent.id,
      skill_id: skill.id,
      verified_public_proficiency_code: 'l10',
      source: 'reviewed',
    })

    const [{ TalentSearchDocumentBuilder }, { TalentSearchIndexRepository }, { searchClient }] =
      await Promise.all([
        import('#modules/search/infra/adapters/entity-search/talents/talent_search_document_builder'),
        import('#modules/search/infra/repositories/entity-search/talents/talent_search_index_repository'),
        import('#platform/search/elasticsearch_client'),
      ])

    const repository = new TalentSearchIndexRepository()
    const builder = new TalentSearchDocumentBuilder(
      new LucidTalentSearchDocumentReader(
        userExternalDependencies.skillCatalog,
        userTalentRepository,
        undefined,
        new LucidSkillTaxonomyCatalogReader()
      )
    )

    await repository.resetIndex()
    await repository.ensureIndex()
    const searchableDocument = await builder.build(searchableTalent.id)
    const hiddenDocument = await builder.build(hiddenTalent.id)
    if (!searchableDocument || !hiddenDocument) {
      throw new Error('Expected persisted talents to produce search documents')
    }
    assert.deepEqual(searchableDocument.skill_evidence, [
      {
        skill_id: skill.id,
        proficiency_code: 'l10',
        proficiency_order: 11,
        source: 'reviewed',
        review_state: 'reviewed',
      },
    ])
    assert.equal(searchableDocument.skill_evidence_known, true)
    assert.equal(searchableDocument.available_from, '2026-09-15')
    await repository.upsertDocument(searchableDocument)
    await repository.upsertDocument(hiddenDocument)
    await searchClient.indices.refresh({ index: repository.indexName })
    const aliases = await searchClient.indices.getAlias({ name: repository.indexName })

    const results = await repository.search({
      q: 'elastic',
      limit: 10,
    })

    assert.isAbove(results.length, 0)
    assert.equal(results[0]?.userId, searchableTalent.id)
    assert.property(aliases, repository.physicalIndexName)
    const physicalIndex = aliases[repository.physicalIndexName]
    assert.exists(physicalIndex)
    if (!physicalIndex) {
      throw new Error('Expected the stable talent alias to resolve to its physical v1 index')
    }
    assert.deepInclude(physicalIndex.aliases[repository.indexName], {
      is_write_index: true,
    })
    assert.notInclude(
      results.map((result) => result.userId),
      hiddenTalent.id
    )

    await repository.replaceAllDocuments([searchableDocument])
    const promotedAliases = await searchClient.indices.getAlias({ name: repository.indexName })
    const promotedBackingIndices = Object.keys(promotedAliases)
    assert.lengthOf(promotedBackingIndices, 1)
    assert.isTrue(
      promotedBackingIndices[0]?.startsWith(`${repository.indexName}_v1_`) ?? false,
      'expected a versioned generation behind the stable talent alias'
    )
    assert.isTrue(await searchClient.indices.exists({ index: repository.physicalIndexName }))
    const promotedCount = await searchClient.count({ index: repository.indexName })
    assert.equal(promotedCount.count, 1)
  }).timeout(10000)

  test('reindexes persisted proficiency and availability into production Discovery', async ({
    assert,
  }) => {
    const strongTalent = await UserFactory.create({ username: 'persisted_strong_talent' })
    const crossMatchTalent = await UserFactory.create({ username: 'persisted_cross_match_talent' })
    const searchSkill = await SkillFactory.create({ skill_name: 'Persisted Search Skill' })
    const designSkill = await SkillFactory.create({ skill_name: 'Persisted Design Skill' })

    await Promise.all([
      strongTalent
        .merge({
          profile_settings: buildProfileSettings({
            is_searchable: true,
            available_from: '2026-09-15',
          }),
        })
        .save(),
      crossMatchTalent
        .merge({
          profile_settings: buildProfileSettings({
            is_searchable: true,
            available_from: '2026-09-15',
          }),
        })
        .save(),
    ])

    await Promise.all([
      UserSkillFactory.create({
        user_id: strongTalent.id,
        skill_id: searchSkill.id,
        verified_public_proficiency_code: 'l10',
        source: 'reviewed',
      }),
      UserSkillFactory.create({
        user_id: crossMatchTalent.id,
        skill_id: searchSkill.id,
        verified_public_proficiency_code: 'l4',
        source: 'reviewed',
      }),
      UserSkillFactory.create({
        user_id: crossMatchTalent.id,
        skill_id: designSkill.id,
        verified_public_proficiency_code: 'l10',
        source: 'reviewed',
      }),
    ])

    await searchPublicApi.resetTalentIndex()
    await Promise.all([
      searchPublicApi.reindexTalentDocument(strongTalent.id),
      searchPublicApi.reindexTalentDocument(crossMatchTalent.id),
    ])

    const context: HttpActionContext = {
      userId: null,
      organizationId: null,
      actorRoleSurface: null,
      ip: '127.0.0.1',
      userAgent: 'talent-search-engine-integration',
    }
    const result = await searchPublicApi.discover(
      {
        criteria: {
          context: 'talents.discovery.public',
          schemaVersion: 1,
          sort: [],
          page: { size: 20 },
          filter: {
            kind: 'condition',
            field: 'talent.skillEvidence',
            operator: 'related_matches',
            effect: 'require',
            unknown: 'exclude',
            value: {
              kind: 'relation',
              expression: {
                kind: 'group',
                combinator: 'and',
                children: [
                  {
                    kind: 'condition',
                    field: 'skillId',
                    operator: 'in',
                    effect: 'require',
                    unknown: 'exclude',
                    value: { kind: 'set', values: [searchSkill.id] },
                  },
                  {
                    kind: 'condition',
                    field: 'proficiencyOrder',
                    operator: 'gte',
                    effect: 'require',
                    unknown: 'exclude',
                    value: { kind: 'scalar', value: 11 },
                  },
                ],
              },
            },
          },
        },
        search: { scope: 'talent' },
      },
      context,
      { searchSessionId: 'persisted-talent-discovery-session' }
    )

    assert.deepEqual(
      result.hits.map(({ entityId }) => entityId),
      [strongTalent.id]
    )
    assert.equal(result.hits[0]?.document['availableFrom'], '2026-09-15')
  }).timeout(20000)

  test('excludes organization-private taxonomy terms from the public talent document', async ({
    assert,
  }) => {
    const talent = await UserFactory.create({ username: 'taxonomy_visibility_talent' })
    const publicSkill = await SkillFactory.create({ skill_name: 'Public Taxonomy Skill' })
    const privateSkill = await SkillFactory.create({ skill_name: 'Private Taxonomy Skill' })
    await UserSkillFactory.create({ user_id: talent.id, skill_id: publicSkill.id })
    await UserSkillFactory.create({ user_id: talent.id, skill_id: privateSkill.id })

    const taxonomyCatalog: TalentSkillTaxonomyCatalogReader = {
      loadSnapshot: () =>
        Promise.resolve({
          version: 11,
          organizationVocabulary: 'supported',
          terms: [
            {
              term: {
                ref: { namespace: 'skills', termId: publicSkill.id },
                version: 11,
                status: 'active',
                labels: { en: publicSkill.skill_name },
                aliases: [],
                parentRefs: [],
              },
              visibility: { kind: 'public' },
            },
            {
              term: {
                ref: { namespace: 'skills', termId: privateSkill.id },
                version: 11,
                status: 'active',
                labels: { en: privateSkill.skill_name },
                aliases: [],
                parentRefs: [],
              },
              visibility: { kind: 'organization', organizationId: 'org-private' },
            },
          ],
        }),
    }

    const record = await new LucidTalentSearchDocumentReader(
      userExternalDependencies.skillCatalog,
      userTalentRepository,
      undefined,
      taxonomyCatalog
    ).findTalentSearchDocumentRecord(talent.id)

    assert.exists(record)
    assert.deepEqual(record?.skills.map((skill) => skill.skillId).sort(), [publicSkill.id])
  })
})
