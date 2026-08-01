import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

function unknownValue(value: unknown): unknown {
  return value
}

function recordValue(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? (Reflect.get(value, key) as unknown)
    : undefined
}

function firstArrayValue(value: unknown): unknown {
  return Array.isArray(value) ? (value[0] as unknown) : undefined
}

test.group('Skill category schema', () => {
  test('skills category CHECK allows four canonical categories and rejects technical', async ({
    assert,
  }) => {
    const result = unknownValue(await db.rawQuery(`
      select pg_get_constraintdef(c.oid) as definition
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      where t.relname = 'skills'
        and c.conname = 'skills_category_code_check'
    `))

    const firstRow = firstArrayValue(recordValue(result, 'rows'))
    const definitionValue = recordValue(firstRow, 'definition')
    const definition = typeof definitionValue === 'string' ? definitionValue : ''

    assert.include(definition, 'technology')
    assert.include(definition, 'engineering')
    assert.include(definition, 'soft_skill')
    assert.include(definition, 'delivery')
    assert.notInclude(definition, 'technical')
  })
})
