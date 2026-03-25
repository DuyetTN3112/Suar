# Lint + Build Fix Plan

## Constraints
- Do not lower ESLint or TypeScript strictness.
- Do not suppress rules with inline comments.
- Fix every reported lint/build error with correct types.
- Avoid broad auto-generated fix scripts.

## Workflow
1. Run requested lint command with `--fix`, enforce timeout, capture full output in `lint-backend-output.log`.
2. Parse errors from log and fix issues one-by-one in source files.
3. Re-run lint minimally to confirm zero backend lint errors.
4. Run `npm run build` with timeout and capture output in `build-output.log`.
5. Fix all build-time errors and warnings that indicate real issues.
6. Re-run build once to confirm clean result.

## Current Error Set (from lint log)
- `app/actions/auth/commands/social_login_command.ts:216:9`
- `app/actions/projects/commands/delete_project_command.ts:95:9`
- `app/actions/projects/commands/delete_project_command.ts:95:30`
- `app/infra/organizations/repositories/organization_user_repository.ts:47:22`

## Notes
- Source lint output is stored in `lint-backend-output.log`.
- Keep edits architecture-compliant (thin controllers, business rules in domain/actions).
