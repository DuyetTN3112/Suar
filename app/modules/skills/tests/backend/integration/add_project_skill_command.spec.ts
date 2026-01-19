import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { applyWhere, findRow } from '../../../../../seed/demo_data/seed_utils.js'
import { seedSkills } from '../../../../../seed/demo_data/skill_seeder.js'

import { addProjectSkillCommand } from '#composition/skills_application_composition'
import ProjectSkill from '#modules/skills/infra/models/project_skill'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  SkillFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Add Project Skill Command', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('rejects duplicate active project skill without adding another row', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const skill = await SkillFactory.create()

    await addProjectSkillCommand.execute({
      projectId: project.id,
      skillId: skill.id,
      addedBy: owner.id,
    })

    await assert.rejects(
      () =>
        addProjectSkillCommand.execute({
          projectId: project.id,
          skillId: skill.id,
          addedBy: owner.id,
        }),
      /Skill already added to this project/
    )

    const projectSkillCount = await ProjectSkill.query()
      .where('project_id', project.id)
      .where('skill_id', skill.id)
      .count('* as total')
    const [countRow] = projectSkillCount
    if (!countRow) {
      assert.fail('Expected project skill count row')
      return
    }

    assert.equal(Number(countRow.$extras['total']), 1)
  })

  test('demo skill seed covers four canonical skill categories', async ({ assert }) => {
    const trx = await db.transaction()

    try {
      await seedSkills(
        {
          uuid: testId,
          isoDaysAgo(daysAgo: number, hour = 9) {
            const date = new Date(Date.UTC(2026, 6, 18 - daysAgo, hour, 0, 0))
            return date.toISOString()
          },
          isoDaysAhead(daysAhead: number, hour = 9) {
            const date = new Date(Date.UTC(2026, 6, 18 + daysAhead, hour, 0, 0))
            return date.toISOString()
          },
          toJson(value: unknown) {
            return JSON.stringify(value)
          },
          requireValue<T>(value: T | undefined, label: string): T {
            if (value === undefined) throw new Error(`${label} is required`)
            return value
          },
          seedPullRequestUrl(seedKey: string) {
            return `https://example.com/suar/${seedKey}/pull/1`
          },
          findRow,
          applyWhere,
        },
        trx
      )

      const rows = (await trx
        .from('skills')
        .select('category_code')
        .count('* as total')
        .groupBy('category_code')) as Array<{ category_code: string; total: string | number }>
      const totals = Object.fromEntries(rows.map((row) => [row.category_code, Number(row.total)]))

      assert.isAtLeast(totals['technology'] ?? 0, 1)
      assert.isAtLeast(totals['engineering'] ?? 0, 1)
      assert.isAtLeast(totals['soft_skill'] ?? 0, 1)
      assert.isAtLeast(totals['delivery'] ?? 0, 1)
      assert.isUndefined(totals['technical'])

      await trx.rollback()
    } catch (error) {
      await trx.rollback()
      throw error
    }
  })
})
