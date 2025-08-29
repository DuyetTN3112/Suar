import { Project } from 'ts-morph'

interface ImportChange {
  filePath: string
  from: string
  to: string
}

const args = process.argv.slice(2)
const moduleName = args.find((arg) => !arg.startsWith('--'))
const dryRun = args.includes('--dry-run')

if (!moduleName) {
  throw new Error('Usage: migrate_module_imports.ts <moduleName> [--dry-run]')
}

const project = new Project({ tsConfigFilePath: './tsconfig.json' })
const changes: ImportChange[] = []

for (const sourceFile of project.getSourceFiles()) {
  let modified = false

  for (const declaration of sourceFile.getImportDeclarations()) {
    const specifier = declaration.getModuleSpecifierValue()
    let nextSpecifier = specifier

    if (specifier.startsWith(`#actions/${moduleName}/`)) {
      nextSpecifier = specifier.replace(
        `#actions/${moduleName}/`,
        `#modules/${moduleName}/actions/`
      )
    } else if (specifier.startsWith(`#infra/${moduleName}/`)) {
      nextSpecifier = specifier.replace(
        `#infra/${moduleName}/`,
        `#modules/${moduleName}/infra/`
      )
    }

    if (nextSpecifier !== specifier) {
      changes.push({
        filePath: sourceFile.getFilePath(),
        from: specifier,
        to: nextSpecifier,
      })

      if (!dryRun) {
        declaration.setModuleSpecifier(nextSpecifier)
        modified = true
      }
    }
  }

  if (modified && !dryRun) {
    await sourceFile.save()
  }
}

for (const change of changes) {
  console.log(`${change.filePath}: ${change.from} -> ${change.to}`)
}

if (dryRun) {
  console.log(`DRY RUN ONLY. ${changes.length} import(s) would be changed.`)
}
