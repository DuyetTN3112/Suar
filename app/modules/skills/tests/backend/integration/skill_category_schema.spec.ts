import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

test.group('Skill category schema', () => {
  test('skills category CHECK allows four canonical categories and rejects technical', async ({
    assert,
  }) => {
    const rows = await db.rawQuery(`
      select pg_get_constraintdef(c.oid) as definition
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relname = 'skills'
        and c.conname = 'skills_category_code_check'
    `)

    const definition = rows.rows[0]?.definition ?? ''

    assert.include(definition, 'technology')
    assert.include(definition, 'engineering')
    assert.include(definition, 'soft_skill')
    assert.include(definition, 'delivery')
    assert.notInclude(definition, 'technical')
  })
})
