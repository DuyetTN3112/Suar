import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  resolveUserDeclaredSkillCommand,
  skillApplication as skillPublicApi,
} from '#composition/skills/skill-application/skills_application_composition'
import Skill from '#modules/skills/infra/models/skill-catalog/skill'
import { SkillCategoryCode } from '#modules/skills/public_contracts/skill_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Resolve User Declared Skill Command', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('keeps the ordinary slug format for names that do not lose meaningful characters', async ({
    assert,
  }) => {
    const resolved = await db.transaction((trx) =>
      resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: 'Domain-Driven Design',
          categoryCode: SkillCategoryCode.ENGINEERING,
        },
        trx
      )
    )

    const skill = resolved ? await Skill.find(resolved.id) : null

    assert.equal(skill?.skill_code, 'domain_driven_design')
  })

  test('gives C++ and C# distinct deterministic catalog entries', async ({ assert }) => {
    const [cpp, csharp, repeatedCpp] = await db.transaction(async (trx) => {
      const resolvedCpp = await resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: 'C++',
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )
      const resolvedCsharp = await resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: 'C#',
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )
      const repeatedResolvedCpp = await resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: 'C++',
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )

      return [resolvedCpp, resolvedCsharp, repeatedResolvedCpp]
    })

    const rows = await Skill.query()
      .whereIn(
        'id',
        [cpp?.id, csharp?.id].filter((id): id is string => id !== undefined)
      )
      .orderBy('skill_name', 'asc')

    assert.lengthOf(rows, 2)
    assert.equal(repeatedCpp?.id, cpp?.id)
    assert.notEqual(rows[0]?.skill_code, rows[1]?.skill_code)
    assert.match(rows[0]?.skill_code ?? '', /^c_[a-f0-9]{16}$/)
    assert.match(rows[1]?.skill_code ?? '', /^c_[a-f0-9]{16}$/)
  })

  test('reuses one deterministic catalog entry for an identical Unicode-only name', async ({
    assert,
  }) => {
    const [first, second] = await db.transaction(async (trx) => {
      const firstResolved = await resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: '程式設計',
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )
      const secondResolved = await resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: '程式設計',
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )

      return [firstResolved, secondResolved]
    })

    const rows = await Skill.query().where('skill_name', '程式設計')

    assert.isNotNull(first)
    assert.equal(second?.id, first?.id)
    assert.lengthOf(rows, 1)
    assert.match(rows[0]?.skill_code ?? '', /^custom_skill_[a-f0-9]{16}$/)
  })

  test('keeps long deterministic codes unique within the catalog column limit', async ({
    assert,
  }) => {
    const sharedPrefix = 'a'.repeat(60)
    const resolved = await db.transaction(async (trx) => {
      const first = await resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: `${sharedPrefix} first`,
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )
      const second = await resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: `${sharedPrefix} second`,
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )

      return [first, second]
    })
    const rows = await Skill.query().whereIn(
      'id',
      resolved.flatMap((skill) => (skill ? [skill.id] : []))
    )

    assert.lengthOf(rows, 2)
    assert.notEqual(rows[0]?.skill_code, rows[1]?.skill_code)
    assert.isTrue(rows.every((skill) => skill.skill_code.length <= 50))
  })

  test('serializes concurrent catalog mutations across separate transactions', async ({
    assert,
  }) => {
    const sharedName = `Concurrent Catalog ${randomUUID()}`
    const distinctNames = [
      `Concurrent Distinct A ${randomUUID()}`,
      `Concurrent Distinct B ${randomUUID()}`,
    ] as const

    const resolveInOwnTransaction = (customSkillName: string) =>
      db.transaction((trx) =>
        resolveUserDeclaredSkillCommand.execute(
          {
            customSkillName,
            categoryCode: SkillCategoryCode.TECHNOLOGY,
          },
          trx
        )
      )

    const [sameFirst, sameSecond] = await Promise.all([
      resolveInOwnTransaction(sharedName),
      resolveInOwnTransaction(sharedName),
    ])
    const distinct = await Promise.all(distinctNames.map(resolveInOwnTransaction))

    assert.isNotNull(sameFirst)
    assert.equal(sameSecond?.id, sameFirst?.id)
    assert.lengthOf(await Skill.query().where('skill_name', sharedName), 1)

    const distinctRows = await Skill.query().whereIn(
      'id',
      distinct.flatMap((skill) => (skill ? [skill.id] : []))
    )
    assert.lengthOf(distinctRows, 2)
    assert.notEqual(distinctRows[0]?.sort_order, distinctRows[1]?.sort_order)
  })

  test('reuses one catalog row across task and user sources in both creation orders', async ({
    assert,
  }) => {
    const taskFirstName = `Cross Source Task First ${randomUUID()}`
    const userFirstName = `Cross Source User First ${randomUUID()}`

    const [taskFirst, userAfterTask, userFirst, taskAfterUser] = await db.transaction(
      async (trx) => {
        const firstTask = await skillPublicApi.findOrCreateCustomTaskSkill(
          {
            name: `  ${taskFirstName}  `,
            categoryCode: SkillCategoryCode.TECHNOLOGY,
          },
          trx
        )
        const userFollowingTask = await resolveUserDeclaredSkillCommand.execute(
          {
            customSkillName: taskFirstName,
            categoryCode: SkillCategoryCode.ENGINEERING,
          },
          trx
        )
        const firstUser = await resolveUserDeclaredSkillCommand.execute(
          {
            customSkillName: ` ${userFirstName} `,
            categoryCode: SkillCategoryCode.ENGINEERING,
          },
          trx
        )
        const taskFollowingUser = await skillPublicApi.findOrCreateCustomTaskSkill(
          {
            name: userFirstName,
            categoryCode: SkillCategoryCode.TECHNOLOGY,
          },
          trx
        )

        return [firstTask, userFollowingTask, firstUser, taskFollowingUser]
      }
    )

    assert.isNotNull(taskFirst)
    assert.equal(userAfterTask?.id, taskFirst?.id)
    assert.isNotNull(userFirst)
    assert.equal(taskAfterUser?.id, userFirst?.id)
    assert.lengthOf(
      await Skill.query().whereIn('skill_name', [taskFirstName, userFirstName]),
      2
    )
  })

  test('reuses an active legacy random-code task skill without mutating its metadata', async ({
    assert,
  }) => {
    const legacyName = `Legacy Task Custom ${randomUUID()}`
    const legacySkill = await Skill.create({
      id: randomUUID(),
      skill_code: `custom_legacy_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      skill_name: legacyName,
      category_code: SkillCategoryCode.DELIVERY,
      display_type: 'list',
      description: `${legacyName} - custom task requirement skill`,
      icon_url: null,
      is_active: true,
      sort_order: 451,
    })

    const resolved = await db.transaction((trx) =>
      resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: `  ${legacyName}  `,
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )
    )

    await legacySkill.refresh()
    assert.equal(resolved?.id, legacySkill.id)
    assert.equal(legacySkill.category_code, SkillCategoryCode.DELIVERY)
    assert.equal(legacySkill.display_type, 'list')
    assert.equal(legacySkill.sort_order, 451)
    assert.lengthOf(await Skill.query().where('skill_name', legacyName), 1)
  })

  test('reactivates only exact historical task custom descriptions', async ({ assert }) => {
    const skillName = `Historical Task Custom ${randomUUID()}`
    const skillCode = skillName.toLowerCase().replaceAll(' ', '_').slice(0, 50)
    const historical = await Skill.create({
      id: randomUUID(),
      skill_code: skillCode,
      skill_name: skillName,
      category_code: SkillCategoryCode.DELIVERY,
      display_type: 'list',
      description: `${skillName} - custom task requirement skill`,
      icon_url: null,
      is_active: false,
      sort_order: 452,
    })

    const resolved = await db.transaction((trx) =>
      resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: skillName,
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )
    )

    await historical.refresh()
    assert.equal(resolved?.id, historical.id)
    assert.isTrue(historical.is_active)
    assert.equal(historical.category_code, SkillCategoryCode.TECHNOLOGY)
    assert.equal(historical.description, `${skillName} - custom task requirement skill`)
  })

  test('keeps a renamed historical custom row eligible for a later reactivation', async ({
    assert,
  }) => {
    const requestedName = `Renamed Historical ${randomUUID().slice(0, 8)}`
    const skillCode = requestedName.toLowerCase().replaceAll(' ', '_').slice(0, 50)
    const historical = await Skill.create({
      id: randomUUID(),
      skill_code: skillCode,
      skill_name: 'Old Historical Catalog Name',
      category_code: SkillCategoryCode.DELIVERY,
      display_type: 'list',
      description: 'Old Historical Catalog Name - user-declared profile skill',
      icon_url: null,
      is_active: false,
      sort_order: 453,
    })

    const firstResolved = await db.transaction((trx) =>
      resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: requestedName,
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )
    )
    await historical.refresh()
    historical.is_active = false
    await historical.save()
    const secondResolved = await db.transaction((trx) =>
      skillPublicApi.findOrCreateCustomTaskSkill(
        {
          name: requestedName,
          categoryCode: SkillCategoryCode.ENGINEERING,
        },
        trx
      )
    )

    await historical.refresh()
    assert.equal(firstResolved?.id, historical.id)
    assert.equal(secondResolved?.id, historical.id)
    assert.isTrue(historical.is_active)
    assert.equal(historical.skill_name, requestedName)
    assert.lengthOf(await Skill.query().where('skill_code', skillCode), 1)
  })

  test('reactivates inactive random-code rows from both historical custom sources', async ({
    assert,
  }) => {
    const taskSkillName = `Historical Random Task ${randomUUID()}`
    const userSkillName = `Historical Random User ${randomUUID()}`
    const historicalTaskSkill = await Skill.create({
      id: randomUUID(),
      skill_code: `custom_task_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      skill_name: taskSkillName,
      category_code: SkillCategoryCode.DELIVERY,
      display_type: 'list',
      description: `${taskSkillName} - custom task requirement skill`,
      icon_url: null,
      is_active: false,
      sort_order: 454,
    })
    const historicalUserSkill = await Skill.create({
      id: randomUUID(),
      skill_code: `custom_user_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      skill_name: userSkillName,
      category_code: SkillCategoryCode.DELIVERY,
      display_type: 'list',
      description: `${userSkillName} - user-declared profile skill`,
      icon_url: null,
      is_active: false,
      sort_order: 455,
    })

    const [resolvedTaskSkill, resolvedUserSkill] = await db.transaction(async (trx) => {
      const resolvedTask = await resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: taskSkillName,
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )
      const resolvedUser = await skillPublicApi.findOrCreateCustomTaskSkill(
        {
          name: userSkillName,
          categoryCode: SkillCategoryCode.ENGINEERING,
        },
        trx
      )
      return [resolvedTask, resolvedUser]
    })

    await historicalTaskSkill.refresh()
    await historicalUserSkill.refresh()
    assert.equal(resolvedTaskSkill?.id, historicalTaskSkill.id)
    assert.equal(resolvedUserSkill?.id, historicalUserSkill.id)
    assert.isTrue(historicalTaskSkill.is_active)
    assert.isTrue(historicalUserSkill.is_active)
    assert.lengthOf(
      await Skill.query().whereIn('skill_name', [taskSkillName, userSkillName]),
      2
    )
  })

  test('refuses an inactive normalized-name canonical match with a non-deterministic code', async ({
    assert,
  }) => {
    const skillName = `Inactive Named Canonical ${randomUUID()}`
    const canonical = await Skill.create({
      id: randomUUID(),
      skill_code: `canonical_${randomUUID().replaceAll('-', '').slice(0, 8)}`,
      skill_name: skillName,
      category_code: SkillCategoryCode.ENGINEERING,
      display_type: 'list',
      description: 'Platform-governed catalog entry',
      icon_url: null,
      is_active: false,
      sort_order: 456,
    })

    const resolved = await db.transaction((trx) =>
      resolveUserDeclaredSkillCommand.execute(
        {
          customSkillName: skillName,
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )
    )

    await canonical.refresh()
    assert.isNull(resolved)
    assert.isFalse(canonical.is_active)
    assert.lengthOf(await Skill.query().where('skill_name', skillName), 1)
  })

  test('task source refuses an inactive canonical collision without creating a duplicate', async ({
    assert,
  }) => {
    const skillName = `Inactive Canonical ${randomUUID()}`
    const skillCode = skillName.toLowerCase().replaceAll(' ', '_').slice(0, 50)
    const canonical = await Skill.create({
      id: randomUUID(),
      skill_code: skillCode,
      skill_name: skillName,
      category_code: SkillCategoryCode.ENGINEERING,
      display_type: 'list',
      description: 'Platform-governed catalog entry',
      icon_url: null,
      is_active: false,
      sort_order: 453,
    })

    const resolved = await db.transaction((trx) =>
      skillPublicApi.findOrCreateCustomTaskSkill(
        {
          name: skillName,
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )
    )

    await canonical.refresh()
    assert.isNull(resolved)
    assert.isFalse(canonical.is_active)
    assert.lengthOf(await Skill.query().where('skill_name', skillName), 1)
  })

  test('keeps task-source long custom codes deterministic and within the catalog limit', async ({
    assert,
  }) => {
    const skillName = `${'task requirement '.repeat(3)}${randomUUID()}`
    const [first, second] = await db.transaction(async (trx) => {
      const firstResolved = await skillPublicApi.findOrCreateCustomTaskSkill(
        {
          name: skillName,
          categoryCode: SkillCategoryCode.TECHNOLOGY,
        },
        trx
      )
      const secondResolved = await skillPublicApi.findOrCreateCustomTaskSkill(
        {
          name: skillName,
          categoryCode: SkillCategoryCode.ENGINEERING,
        },
        trx
      )
      return [firstResolved, secondResolved]
    })
    const skill = first ? await Skill.find(first.id) : null

    assert.isNotNull(first)
    assert.equal(second?.id, first?.id)
    assert.isAtMost(skill?.skill_code.length ?? Number.POSITIVE_INFINITY, 50)
  })

  test('serializes concurrent cross-source requests to one catalog row', async ({ assert }) => {
    const skillName = `Concurrent Cross Source ${randomUUID()}`

    const [taskResolved, userResolved] = await Promise.all([
      db.transaction((trx) =>
        skillPublicApi.findOrCreateCustomTaskSkill(
          {
            name: skillName,
            categoryCode: SkillCategoryCode.TECHNOLOGY,
          },
          trx
        )
      ),
      db.transaction((trx) =>
        resolveUserDeclaredSkillCommand.execute(
          {
            customSkillName: ` ${skillName} `,
            categoryCode: SkillCategoryCode.ENGINEERING,
          },
          trx
        )
      ),
    ])

    assert.isNotNull(taskResolved)
    assert.equal(userResolved?.id, taskResolved?.id)
    assert.lengthOf(await Skill.query().where('skill_name', skillName), 1)
  })
})
