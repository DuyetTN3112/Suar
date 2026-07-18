import fs from 'node:fs/promises'
import path from 'node:path'

import pg from 'pg'

const { Client } = pg

function parseEnvFile(contents) {
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    const key = line.slice(0, separatorIndex)
    const value = line.slice(separatorIndex + 1)

    if (!(key in process.env)) {
      process.env[key] = value
    }
  }
}

async function loadEnv() {
  const envPath = path.join(process.cwd(), '.env')
  const contents = await fs.readFile(envPath, 'utf8')
  parseEnvFile(contents)
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function escapeString(value) {
  return String(value).replaceAll("'", "''")
}

function toSqlLiteral(value, pgType) {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL'
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE'
  }

  if (value instanceof Date) {
    return `'${escapeString(value.toISOString())}'`
  }

  const normalizedPgType = String(pgType ?? '').toLowerCase()
  if (normalizedPgType === 'json' || normalizedPgType === 'jsonb') {
    return `'${escapeString(JSON.stringify(value))}'::${normalizedPgType}`
  }

  return `'${escapeString(value)}'`
}

function renderSection(title, body) {
  return [`--`, `-- ${title}`, `--`, body.trimEnd(), ''].join('\n')
}

async function getEnums(client) {
  const { rows } = await client.query(`
    select
      t.typname as enum_name,
      e.enumlabel as enum_value,
      e.enumsortorder
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    order by t.typname asc, e.enumsortorder asc
  `)

  const byEnum = new Map()
  for (const row of rows) {
    const values = byEnum.get(row.enum_name) ?? []
    values.push(row.enum_value)
    byEnum.set(row.enum_name, values)
  }

  return [...byEnum.entries()].map(([enumName, values]) => {
    const renderedValues = values.map((value) => `'${escapeString(value)}'`).join(', ')
    return `create type public.${quoteIdentifier(enumName)} as enum (${renderedValues});`
  })
}

async function getTableNames(client) {
  const { rows } = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name asc
  `)

  return rows.map((row) => row.table_name)
}

async function getTableDefinition(client, tableName) {
  const { rows: columnRows } = await client.query(
    `
      select
        a.attname as column_name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) as data_type,
        a.attnotnull as not_null,
        pg_get_expr(d.adbin, d.adrelid) as column_default
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where n.nspname = 'public'
        and c.relname = $1
        and a.attnum > 0
        and not a.attisdropped
      order by a.attnum asc
    `,
    [tableName]
  )

  const { rows: constraintRows } = await client.query(
    `
      select
        conname,
        contype,
        pg_get_constraintdef(oid, true) as definition
      from pg_constraint
      where conrelid = $1::regclass
        and contype in ('p', 'u', 'f', 'c')
      order by
        case contype
          when 'p' then 0
          when 'u' then 1
          when 'f' then 2
          else 3
        end,
        conname asc
    `,
    [`public.${quoteIdentifier(tableName)}`]
  )

  const lines = []
  for (const column of columnRows) {
    const parts = [
      `  ${quoteIdentifier(column.column_name)}`,
      column.data_type,
    ]
    if (column.column_default) {
      parts.push(`default ${column.column_default}`)
    }
    if (column.not_null) {
      parts.push('not null')
    }
    lines.push(parts.join(' '))
  }

  for (const constraint of constraintRows) {
    lines.push(`  constraint ${quoteIdentifier(constraint.conname)} ${constraint.definition}`)
  }

  return `create table public.${quoteIdentifier(tableName)} (\n${lines.join(',\n')}\n);`
}

async function getViews(client) {
  const { rows } = await client.query(`
    select
      viewname,
      definition
    from pg_views
    where schemaname = 'public'
    order by viewname asc
  `)

  return rows.map((row) => {
    return `create or replace view public.${quoteIdentifier(row.viewname)} as\n${row.definition.trimEnd()};`
  })
}

async function getIndexes(client) {
  const { rows } = await client.query(`
    select indexname, indexdef
    from pg_indexes
    where schemaname = 'public'
    order by tablename asc, indexname asc
  `)

  return rows.map((row) => `${row.indexdef};`)
}

async function getFunctions(client) {
  const { rows } = await client.query(`
    select
      p.oid,
      p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
    order by p.proname asc, p.oid asc
  `)

  const definitions = []
  for (const row of rows) {
    const { rows: definitionRows } = await client.query(
      `select pg_get_functiondef($1::oid) as definition`,
      [row.oid]
    )
    definitions.push(definitionRows[0].definition.trimEnd() + ';')
  }

  return definitions
}

async function getTableData(client, tableName, orderByColumns = []) {
  const { rows: columnRows } = await client.query(
    `
      select
        a.attname as column_name,
        format_type(a.atttypid, a.atttypmod) as data_type
      from pg_attribute a
      join pg_class c on c.oid = a.attrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = $1
        and a.attnum > 0
        and not a.attisdropped
      order by a.attnum asc
    `,
    [tableName]
  )

  const columnNames = columnRows.map((row) => row.column_name)
  const orderClause =
    orderByColumns.length > 0
      ? ` order by ${orderByColumns.map((columnName) => quoteIdentifier(columnName)).join(', ')}`
      : ''

  const { rows } = await client.query(
    `select * from public.${quoteIdentifier(tableName)}${orderClause}`
  )

  if (rows.length === 0) {
    return [`-- ${tableName}: no rows`]
  }

  return rows.map((row) => {
    const renderedColumns = columnNames.map((columnName) => quoteIdentifier(columnName)).join(', ')
    const renderedValues = columnRows
      .map((column) => toSqlLiteral(row[column.column_name], column.data_type))
      .join(', ')

    return `insert into public.${quoteIdentifier(tableName)} (${renderedColumns}) values (${renderedValues});`
  })
}

async function main() {
  await loadEnv()

  const outputPath = path.join(process.cwd(), 'docs_AI', 'suar.sql')
  await fs.mkdir(path.dirname(outputPath), { recursive: true })

  const client = new Client({
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT || 5432),
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE,
  })

  await client.connect()

  try {
    const enums = await getEnums(client)
    const tableNames = await getTableNames(client)
    const tableDefinitions = []
    for (const tableName of tableNames) {
      tableDefinitions.push(await getTableDefinition(client, tableName))
    }
    const views = await getViews(client)
    const indexes = await getIndexes(client)
    const functions = await getFunctions(client)
    const proficiencyScaleData = await getTableData(client, 'proficiency_scales', ['code', 'version'])
    const proficiencyLevelData = await getTableData(client, 'proficiency_levels', ['scale_id', 'ordinal'])

    const header = [
      '-- Suar runtime schema snapshot',
      `-- Generated at: ${new Date().toISOString()}`,
      `-- Source DB: ${process.env.PG_DATABASE ?? 'unknown'}`,
      '-- Generated by: scripts/export_runtime_schema_snapshot.mjs',
      '',
    ].join('\n')

    const contents = [
      header,
      renderSection('ENUMS', enums.join('\n\n')),
      renderSection('TABLES', tableDefinitions.join('\n\n')),
      renderSection('VIEWS', views.join('\n\n')),
      renderSection('INDEXES', indexes.join('\n')),
      renderSection('FUNCTIONS', functions.join('\n\n')),
      renderSection(
        'CANONICAL PROFICIENCY SCALE DATA',
        [...proficiencyScaleData, '', ...proficiencyLevelData].join('\n')
      ),
    ].join('\n')

    await fs.writeFile(outputPath, contents)
    console.log(`Wrote ${outputPath}`)
  } finally {
    await client.end()
  }
}

await main()
